"""
Verification Script - Check Backend Optimization

This script verifies that all optimizations have been applied correctly.
"""
import os
import sys
from pathlib import Path

def check_file_exists(path: str, should_exist: bool = True) -> bool:
    """Check if file exists."""
    exists = Path(path).exists()
    status = "✅" if exists == should_exist else "❌"
    expectation = "exists" if should_exist else "removed"
    print(f"{status} {path} - {expectation}")
    return exists == should_exist

def check_directory_structure():
    """Verify new directory structure."""
    print("\n🔍 Checking Directory Structure...")
    
    checks = [
        # New structure should exist
        ("backend/config/__init__.py", True),
        ("backend/config/settings.py", True),
        ("backend/config/database.py", True),
        ("backend/README.md", True),
        ("OPTIMIZATION_SUMMARY.md", True),
        
        # Test files should be moved
        ("tests/backend/test_intent_promotion.py", True),
        ("tests/backend/test_final_comprehensive.py", True),
        ("tests/backend/debug_carousel.py", True),
        
        # Test files should NOT be in backend/
        ("backend/test_intent_promotion.py", False),
        ("backend/debug_carousel.py", False),
        ("backend/check_promotions.py", False),
    ]
    
    results = [check_file_exists(path, should_exist) for path, should_exist in checks]
    return all(results)

def check_imports():
    """Check if imports are correct."""
    print("\n🔍 Checking Imports...")
    
    try:
        # Change to backend directory
        backend_dir = Path(__file__).parent / "backend"
        sys.path.insert(0, str(backend_dir.parent))
        
        # Test config imports
        print("Testing config imports...")
        from backend.config.settings import settings
        print(f"✅ settings.DB_NAME = {settings.DB_NAME}")
        
        print("✅ All imports working!")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Note: This is expected if dependencies not installed in this environment")
        return False
    except Exception as e:
        print(f"⚠️  {e}")
        return False

def check_code_quality():
    """Check code quality improvements."""
    print("\n🔍 Checking Code Quality...")
    
    # Check for docstrings in key files
    files_to_check = [
        "backend/payment_service.py",
        "backend/chatbot_service.py",
        "backend/config/settings.py",
    ]
    
    for file_path in files_to_check:
        if Path(file_path).exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                has_docstring = '"""' in content and 'Args:' in content
                status = "✅" if has_docstring else "⚠️"
                print(f"{status} {file_path} - Docstrings")
    
    return True

def verify_intent_recognition():
    """Verify intent recognition patterns."""
    print("\n🔍 Checking Intent Recognition...")
    
    try:
        sys.path.insert(0, str(Path(__file__).parent / "backend"))
        from chatbot.intent_recognizer import IntentRecognizer
        
        recognizer = IntentRecognizer(use_ai=False)
        
        # Test queries
        test_queries = [
            ("Có khuyến mãi gì không?", "ask_promotion"),
            ("Có món nào đang giảm giá không?", "ask_promotion"),
            ("Có món nào rẻ hơn không?", "ask_promotion"),
        ]
        
        all_passed = True
        for query, expected_intent in test_queries:
            result = recognizer.recognize_intent(query, store_id="test")
            actual_intent = result.get("intent", "unknown")
            passed = actual_intent == expected_intent
            status = "✅" if passed else "❌"
            print(f"{status} '{query}' → {actual_intent} (expected: {expected_intent})")
            all_passed = all_passed and passed
        
        return all_passed
    except ImportError as e:
        print(f"⚠️  Could not import IntentRecognizer: {e}")
        print("This is expected if dependencies are not installed")
        return False
    except Exception as e:
        print(f"⚠️  {e}")
        return False

def main():
    """Run all verification checks."""
    print("=" * 70)
    print("🔍 Backend Optimization Verification")
    print("=" * 70)
    
    results = {
        "Directory Structure": check_directory_structure(),
        "Imports": check_imports(),
        "Code Quality": check_code_quality(),
        "Intent Recognition": verify_intent_recognition(),
    }
    
    print("\n" + "=" * 70)
    print("📊 Verification Summary")
    print("=" * 70)
    
    for check, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {check}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 70)
    if all_passed:
        print("🎉 All checks passed! Backend is optimized and ready.")
    else:
        print("⚠️  Some checks failed. Review the output above.")
        print("Note: Import checks may fail if running outside virtual environment.")
    print("=" * 70)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
