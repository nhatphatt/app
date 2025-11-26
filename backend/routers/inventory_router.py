"""Inventory Management API Router."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from models.inventory_models import (
    DishInventoryCreate,
    DishInventoryUpdate,
    DishInventory,
    InventoryAdjustment,
    InventoryHistory,
    BulkInventoryImport
)

# Router will be initialized with db and get_current_user dependencies
router = APIRouter(prefix="/inventory-dishes", tags=["Inventory Management"])


def create_inventory_router(db, get_current_user):
    """Factory function to create inventory router with dependencies."""
    
    @router.get("", response_model=List[DishInventory])
    async def get_all_inventory(current_user: dict = Depends(get_current_user)):
        """Get all inventory items for current store"""
        items = await db.dishes_inventory.find(
            {"store_id": current_user["store_id"]},
            {"_id": 0}
        ).sort("dish_name", 1).to_list(1000)
        
        return items
    
    @router.get("/low-stock", response_model=List[DishInventory])
    async def get_low_stock_items(current_user: dict = Depends(get_current_user)):
        """Get items with low stock (below reorder threshold)"""
        items = await db.dishes_inventory.find(
            {
                "store_id": current_user["store_id"],
                "is_low_stock": True
            },
            {"_id": 0}
        ).to_list(1000)
        
        return items
    
    @router.get("/{item_id}", response_model=DishInventory)
    async def get_inventory_item(item_id: str, current_user: dict = Depends(get_current_user)):
        """Get specific inventory item"""
        item = await db.dishes_inventory.find_one(
            {"id": item_id, "store_id": current_user["store_id"]},
            {"_id": 0}
        )
        
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        return item
    
    @router.post("", response_model=DishInventory)
    async def create_inventory_item(
        input_data: DishInventoryCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new inventory item"""
        # Check if dish already exists
        existing = await db.dishes_inventory.find_one({
            "store_id": current_user["store_id"],
            "dish_name": input_data.dish_name
        })
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Món '{input_data.dish_name}' đã tồn tại trong kho"
            )
        
        item_id = str(uuid.uuid4())
        is_low_stock = input_data.quantity_in_stock <= input_data.reorder_threshold
        
        item_doc = {
            "id": item_id,
            "store_id": current_user["store_id"],
            "dish_name": input_data.dish_name,
            "category_name": input_data.category_name,
            "quantity_in_stock": input_data.quantity_in_stock,
            "reorder_threshold": input_data.reorder_threshold,
            "unit": input_data.unit,
            "is_low_stock": is_low_stock,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.dishes_inventory.insert_one(item_doc)
        
        return DishInventory(**item_doc)
    
    @router.put("/{item_id}", response_model=DishInventory)
    async def update_inventory_item(
        item_id: str,
        input_data: DishInventoryUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update inventory item details"""
        # Get existing item
        existing = await db.dishes_inventory.find_one({
            "id": item_id,
            "store_id": current_user["store_id"]
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        # Build update data
        update_data = {k: v for k, v in input_data.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        # Update last_updated timestamp
        update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        # Recalculate is_low_stock if quantity or threshold changed
        new_quantity = update_data.get("quantity_in_stock", existing["quantity_in_stock"])
        new_threshold = update_data.get("reorder_threshold", existing["reorder_threshold"])
        update_data["is_low_stock"] = new_quantity <= new_threshold
        
        await db.dishes_inventory.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
        
        # Get updated item
        updated_item = await db.dishes_inventory.find_one({"id": item_id}, {"_id": 0})
        
        return DishInventory(**updated_item)
    
    @router.post("/{item_id}/adjust", response_model=DishInventory)
    async def adjust_inventory_quantity(
        item_id: str,
        adjustment: InventoryAdjustment,
        current_user: dict = Depends(get_current_user)
    ):
        """Adjust inventory quantity (add, subtract, or set)"""
        # Get existing item
        item = await db.dishes_inventory.find_one({
            "id": item_id,
            "store_id": current_user["store_id"]
        })
        
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        quantity_before = item["quantity_in_stock"]
        
        # Calculate new quantity
        if adjustment.adjustment_type == "add":
            new_quantity = quantity_before + adjustment.quantity
        elif adjustment.adjustment_type == "subtract":
            new_quantity = max(0, quantity_before - adjustment.quantity)
        elif adjustment.adjustment_type == "set":
            new_quantity = adjustment.quantity
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid adjustment type. Must be 'add', 'subtract', or 'set'"
            )
        
        # Update inventory
        is_low_stock = new_quantity <= item["reorder_threshold"]
        
        await db.dishes_inventory.update_one(
            {"id": item_id},
            {
                "$set": {
                    "quantity_in_stock": new_quantity,
                    "is_low_stock": is_low_stock,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Record history
        history_id = str(uuid.uuid4())
        history_doc = {
            "id": history_id,
            "inventory_id": item_id,
            "adjustment_type": adjustment.adjustment_type,
            "quantity_before": quantity_before,
            "quantity_after": new_quantity,
            "quantity_changed": new_quantity - quantity_before,
            "reason": adjustment.reason,
            "reference_order_id": adjustment.reference_order_id,
            "adjusted_by": current_user["id"],
            "adjusted_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.inventory_history.insert_one(history_doc)
        
        # Get updated item
        updated_item = await db.dishes_inventory.find_one({"id": item_id}, {"_id": 0})
        
        return DishInventory(**updated_item)
    
    @router.get("/{item_id}/history", response_model=List[InventoryHistory])
    async def get_inventory_history(
        item_id: str,
        limit: int = 50,
        current_user: dict = Depends(get_current_user)
    ):
        """Get inventory adjustment history"""
        # Verify item exists and belongs to store
        item = await db.dishes_inventory.find_one({
            "id": item_id,
            "store_id": current_user["store_id"]
        })
        
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        history = await db.inventory_history.find(
            {"inventory_id": item_id},
            {"_id": 0}
        ).sort("adjusted_at", -1).limit(limit).to_list(limit)
        
        return history
    
    @router.delete("/{item_id}")
    async def delete_inventory_item(
        item_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete inventory item"""
        result = await db.dishes_inventory.delete_one({
            "id": item_id,
            "store_id": current_user["store_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        return {"message": "Inventory item deleted successfully"}
    
    @router.post("/bulk-import")
    async def bulk_import_inventory(
        input_data: BulkInventoryImport,
        current_user: dict = Depends(get_current_user)
    ):
        """Bulk import inventory items"""
        created_items = []
        errors = []
        
        for idx, item_data in enumerate(input_data.items):
            # Check if dish already exists
            existing = await db.dishes_inventory.find_one({
                "store_id": current_user["store_id"],
                "dish_name": item_data.dish_name
            })
            
            if existing:
                errors.append({
                    "index": idx,
                    "dish_name": item_data.dish_name,
                    "error": "Món đã tồn tại trong kho"
                })
                continue
            
            item_id = str(uuid.uuid4())
            is_low_stock = item_data.quantity_in_stock <= item_data.reorder_threshold
            
            item_doc = {
                "id": item_id,
                "store_id": current_user["store_id"],
                "dish_name": item_data.dish_name,
                "category_name": item_data.category_name,
                "quantity_in_stock": item_data.quantity_in_stock,
                "reorder_threshold": item_data.reorder_threshold,
                "unit": item_data.unit,
                "is_low_stock": is_low_stock,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            try:
                await db.dishes_inventory.insert_one(item_doc)
                created_items.append(DishInventory(**item_doc))
            except Exception as e:
                errors.append({
                    "index": idx,
                    "dish_name": item_data.dish_name,
                    "error": str(e)
                })
        
        return {
            "items_success": len(created_items),
            "items_failed": len(errors),
            "created_items": created_items,
            "errors": errors
        }
    
    @router.get("/stats/summary")
    async def get_inventory_summary(current_user: dict = Depends(get_current_user)):
        """Get inventory summary statistics"""
        # Total items
        total_items = await db.dishes_inventory.count_documents({
            "store_id": current_user["store_id"]
        })
        
        # Low stock items
        low_stock_count = await db.dishes_inventory.count_documents({
            "store_id": current_user["store_id"],
            "is_low_stock": True
        })
        
        # Out of stock items
        out_of_stock_count = await db.dishes_inventory.count_documents({
            "store_id": current_user["store_id"],
            "quantity_in_stock": 0
        })
        
        # Total stock value (if price is available)
        items = await db.dishes_inventory.find(
            {"store_id": current_user["store_id"]},
            {"_id": 0, "quantity_in_stock": 1}
        ).to_list(1000)
        
        total_quantity = sum(item["quantity_in_stock"] for item in items)
        
        # Category breakdown
        pipeline = [
            {"$match": {"store_id": current_user["store_id"]}},
            {
                "$group": {
                    "_id": "$category_name",
                    "count": {"$sum": 1},
                    "total_quantity": {"$sum": "$quantity_in_stock"},
                    "low_stock_count": {
                        "$sum": {"$cond": ["$is_low_stock", 1, 0]}
                    }
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        category_stats = await db.dishes_inventory.aggregate(pipeline).to_list(100)
        
        return {
            "total_items": total_items,
            "total_quantity": total_quantity,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "categories": [
                {
                    "category_name": stat["_id"],
                    "item_count": stat["count"],
                    "total_quantity": stat["total_quantity"],
                    "low_stock_count": stat["low_stock_count"]
                }
                for stat in category_stats
            ]
        }
    
    return router
