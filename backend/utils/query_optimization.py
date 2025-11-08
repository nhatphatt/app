"""Query optimization utilities.

This module provides helpers for optimizing database queries and reducing query count.
"""

from typing import List, Dict, Any
from datetime import datetime, timezone


class QueryOptimizer:
    """Utility class for query optimization."""
    
    @staticmethod
    def batch_lookup(items: List[Dict], lookup_dict: Dict[str, Any], lookup_key: str, target_key: str) -> List[Dict]:
        """
        Batch lookup to avoid N+1 query problem.
        
        Instead of querying for each item:
            for item in items:
                related = await db.collection.find_one({"id": item["related_id"]})
        
        Use this:
            related_ids = [item["related_id"] for item in items]
            related_items = await db.collection.find({"id": {"$in": related_ids}}).to_list(None)
            lookup_dict = {item["id"]: item for item in related_items}
            items = QueryOptimizer.batch_lookup(items, lookup_dict, "related_id", "related")
        
        Args:
            items: List of items to enrich
            lookup_dict: Dictionary mapping lookup_key values to looked-up objects
            lookup_key: Key in items to use for lookup
            target_key: Key to store looked-up object
            
        Returns:
            List of items with target_key populated
        """
        for item in items:
            lookup_value = item.get(lookup_key)
            if lookup_value and lookup_value in lookup_dict:
                item[target_key] = lookup_dict[lookup_value]
        return items
    
    @staticmethod
    async def enrich_orders_with_payments(orders: List[Dict], db) -> List[Dict]:
        """
        Enrich orders with payment information using batch query.
        
        This replaces the N+1 query pattern where we query payment for each order.
        
        Args:
            orders: List of order documents
            db: Database instance
            
        Returns:
            Orders enriched with payment information
        """
        if not orders:
            return orders
        
        # Get all order IDs
        order_ids = [order["id"] for order in orders]
        
        # Batch query for all payments
        payments = await db.payments.find(
            {"order_id": {"$in": order_ids}}
        ).to_list(None)
        
        # Create lookup dictionary
        payment_map = {payment["order_id"]: payment for payment in payments}
        
        # Enrich orders
        for order in orders:
            payment = payment_map.get(order["id"])
            if payment:
                order["payment_info"] = {
                    "method": payment.get("payment_method"),
                    "status": payment.get("status"),
                    "paid_at": payment.get("paid_at"),
                    "qr_code_url": payment.get("qr_code_url")
                }
            else:
                order["payment_info"] = None
        
        return orders
    
    @staticmethod
    async def enrich_orders_with_items(orders: List[Dict], db) -> List[Dict]:
        """
        Enrich order items with menu item details using batch query.
        
        Args:
            orders: List of order documents
            db: Database instance
            
        Returns:
            Orders with enriched item information
        """
        if not orders:
            return orders
        
        # Collect all unique item IDs from all orders
        item_ids = set()
        for order in orders:
            for item in order.get("items", []):
                item_ids.add(item["item_id"])
        
        if not item_ids:
            return orders
        
        # Batch query for all menu items
        menu_items = await db.menu_items.find(
            {"id": {"$in": list(item_ids)}}
        ).to_list(None)
        
        # Create lookup dictionary
        item_map = {item["id"]: item for item in menu_items}
        
        # Enrich order items
        for order in orders:
            for item in order.get("items", []):
                menu_item = item_map.get(item["item_id"])
                if menu_item:
                    item["name"] = menu_item.get("name")
                    item["image"] = menu_item.get("image")
        
        return orders
    
    @staticmethod
    async def get_active_promotions(db, store_id: str) -> List[Dict]:
        """
        Get active promotions using optimized query with index.
        
        Uses compound index: (store_id, is_active, start_date, end_date)
        
        Args:
            db: Database instance
            store_id: Store ID
            
        Returns:
            List of active promotions
        """
        now = datetime.now(timezone.utc).isoformat()
        
        promotions = await db.promotions.find({
            "store_id": store_id,
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        }).to_list(100)
        
        return promotions
    
    @staticmethod
    def apply_promotions_batch(items: List[Dict], promotions: List[Dict]) -> List[Dict]:
        """
        Apply promotions to multiple items in batch (in-memory operation).
        
        This is much faster than querying promotions for each item individually.
        
        Args:
            items: List of menu items
            promotions: List of active promotions
            
        Returns:
            Items with promotion information applied
        """
        if not promotions:
            return items
        
        for item in items:
            item_id = item.get("id")
            category_id = item.get("category_id")
            original_price = item.get("price", 0)
            
            # Find applicable promotion (first match wins)
            applicable_promotion = None
            for promotion in promotions:
                apply_to = promotion.get("apply_to", "")
                
                if apply_to == "all":
                    applicable_promotion = promotion
                    break
                elif apply_to == "category" and category_id in promotion.get("category_ids", []):
                    applicable_promotion = promotion
                    break
                elif apply_to == "items" and item_id in promotion.get("item_ids", []):
                    applicable_promotion = promotion
                    break
            
            # Apply promotion if found
            if applicable_promotion:
                promo_type = applicable_promotion.get("promotion_type", "percentage")
                discount_value = applicable_promotion.get("discount_value", 0)
                
                if promo_type == "percentage":
                    discount_amount = original_price * (discount_value / 100)
                    final_price = original_price - discount_amount
                elif promo_type == "fixed_amount":
                    final_price = max(0, original_price - discount_value)
                    discount_value = (discount_value / original_price * 100) if original_price > 0 else 0
                else:
                    final_price = original_price
                
                item["has_promotion"] = True
                item["original_price"] = original_price
                item["discounted_price"] = final_price
                item["discount_percent"] = round(discount_value, 0)
                item["promotion_label"] = f"Giảm {int(discount_value)}%"
                item["promotion_name"] = applicable_promotion.get("name")
            else:
                item["has_promotion"] = False
        
        return items
    
    @staticmethod
    def create_pagination_query(page: int = 1, page_size: int = 20, max_size: int = 100) -> Dict[str, int]:
        """
        Create pagination parameters for queries.
        
        Args:
            page: Page number (1-indexed)
            page_size: Items per page
            max_size: Maximum allowed page size
            
        Returns:
            Dictionary with skip and limit values
        """
        # Validate and sanitize inputs
        page = max(1, int(page))
        page_size = min(max(1, int(page_size)), max_size)
        
        skip = (page - 1) * page_size
        
        return {
            "skip": skip,
            "limit": page_size
        }
    
    @staticmethod
    async def count_and_fetch(collection, query: Dict, skip: int, limit: int, sort: List = None) -> Dict:
        """
        Count total documents and fetch page in a single efficient operation.
        
        Args:
            collection: MongoDB collection
            query: Query filter
            skip: Number of documents to skip
            limit: Number of documents to return
            sort: Sort criteria (list of tuples)
            
        Returns:
            Dictionary with total count and items
        """
        # Count total (uses index if possible)
        total = await collection.count_documents(query)
        
        # Fetch page
        cursor = collection.find(query, {"_id": 0}).skip(skip).limit(limit)
        
        if sort:
            cursor = cursor.sort(sort)
        
        items = await cursor.to_list(None)
        
        return {
            "total": total,
            "items": items,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1
        }


class CacheHelper:
    """Helper for in-memory caching (simple implementation)."""
    
    _cache = {}
    _cache_timestamps = {}
    
    @classmethod
    def set(cls, key: str, value: Any, ttl_seconds: int = 300):
        """
        Set cache value with TTL.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: Time to live in seconds (default 5 minutes)
        """
        cls._cache[key] = value
        cls._cache_timestamps[key] = datetime.now(timezone.utc).timestamp() + ttl_seconds
    
    @classmethod
    def get(cls, key: str) -> Any:
        """
        Get cache value if not expired.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if expired/not found
        """
        if key not in cls._cache:
            return None
        
        # Check if expired
        if datetime.now(timezone.utc).timestamp() > cls._cache_timestamps.get(key, 0):
            # Expired, remove from cache
            cls._cache.pop(key, None)
            cls._cache_timestamps.pop(key, None)
            return None
        
        return cls._cache[key]
    
    @classmethod
    def clear(cls, key: str = None):
        """
        Clear cache.
        
        Args:
            key: Specific key to clear, or None to clear all
        """
        if key:
            cls._cache.pop(key, None)
            cls._cache_timestamps.pop(key, None)
        else:
            cls._cache.clear()
            cls._cache_timestamps.clear()
    
    @classmethod
    def clear_pattern(cls, pattern: str):
        """
        Clear all cache keys matching pattern.
        
        Args:
            pattern: Pattern to match (e.g., "store:123:*")
        """
        keys_to_remove = [k for k in cls._cache.keys() if pattern in k]
        for key in keys_to_remove:
            cls._cache.pop(key, None)
            cls._cache_timestamps.pop(key, None)
