#!/usr/bin/env python3
"""
Simple validation script to verify 3 critical features are integrated
"""

import os
import sys

print("🔍 Validating 3 Critical Features Integration\n")
print("=" * 60)

# Check 1: Auth module files
print("\n✅ CHECK 1: Authentication Files")
auth_files = [
    "auth/__init__.py",
    "auth/models.py",
    "auth/password.py",
    "auth/jwt.py",
    "auth/routes.py"
]

auth_complete = True
for file in auth_files:
    exists = os.path.exists(file)
    status = "✅" if exists else "❌"
    print(f"  {status} {file}")
    if not exists:
        auth_complete = False

# Check 2: Payments module files
print("\n✅ CHECK 2: Payment Files")
payment_files = [
    "payments/__init__.py",
    "payments/stripe_service.py",
    "payments/routes.py"
]

payments_complete = True
for file in payment_files:
    exists = os.path.exists(file)
    status = "✅" if exists else "❌"
    print(f"  {status} {file}")
    if not exists:
        payments_complete = False

# Check 3: Notifications module files
print("\n✅ CHECK 3: Email Notification Files")
notification_files = [
    "notifications/__init__.py",
    "notifications/email_service.py",
    "notifications/routes.py"
]

notifications_complete = True
for file in notification_files:
    exists = os.path.exists(file)
    status = "✅" if exists else "❌"
    print(f"  {status} {file}")
    if not exists:
        notifications_complete = False

# Check 4: Main.py integration
print("\n✅ CHECK 4: Main.py Integration")
try:
    with open("main.py", "r") as f:
        main_content = f.read()
    
    checks = [
        ("auth.routes import", "from auth.routes import router" in main_content),
        ("payments.routes import", "from payments.routes import router" in main_content),
        ("notifications.routes import", "from notifications.routes import router" in main_content),
        ("auth router included", "app.include_router(simple_auth_router)" in main_content),
        ("payments router included", "app.include_router(payments_router)" in main_content),
        ("notifications router included", "app.include_router(notifications_router)" in main_content),
    ]
    
    main_integration_complete = True
    for check_name, check_result in checks:
        status = "✅" if check_result else "❌"
        print(f"  {status} {check_name}")
        if not check_result:
            main_integration_complete = False
    
except FileNotFoundError:
    print("  ❌ main.py not found")
    main_integration_complete = False

# Check 5: Environment configuration
print("\n✅ CHECK 5: Environment Configuration")
env_example_exists = os.path.exists(".env.example")
print(f"  {'✅' if env_example_exists else '❌'} .env.example file")

# Check 6: Testing checklist
print("\n✅ CHECK 6: Documentation")
docs = [
    ("../TESTING_CHECKLIST.md", "Testing checklist"),
    ("../IMPLEMENTATION_GUIDE_3_FEATURES.md", "Implementation guide"),
    ("../MASTER_DEVELOPMENT_PLAN.md", "Master development plan"),
]

docs_complete = True
for filepath, name in docs:
    exists = os.path.exists(filepath)
    status = "✅" if exists else "❌"
    print(f"  {status} {name}")
    if not exists:
        docs_complete = False

# Final summary
print("\n" + "=" * 60)
print("\n📊 VALIDATION SUMMARY:\n")

all_complete = (auth_complete and payments_complete and 
                notifications_complete and main_integration_complete and 
                env_example_exists and docs_complete)

features = [
    ("🔐 Authentication", auth_complete),
    ("💳 Payments (Stripe)", payments_complete),
    ("📧 Email Notifications (SendGrid)", notifications_complete),
    ("🔗 Main.py Integration", main_integration_complete),
    ("⚙️  Environment Config", env_example_exists),
    ("📚 Documentation", docs_complete),
]

for feature, complete in features:
    status = "✅ COMPLETE" if complete else "❌ INCOMPLETE"
    print(f"  {feature:40} {status}")

print("\n" + "=" * 60)

if all_complete:
    print("\n🎉 SUCCESS! All 3 critical features are fully integrated!")
    print("\nNext steps:")
    print("  1. Copy .env.example to .env and configure API keys")
    print("  2. Start backend: uvicorn main:app --reload")
    print("  3. Test endpoints using TESTING_CHECKLIST.md")
    print("  4. Access API docs: http://localhost:8000/docs")
    sys.exit(0)
else:
    print("\n⚠️  INCOMPLETE: Some components are missing")
    print("Review the checklist above to see what needs attention.")
    sys.exit(1)
