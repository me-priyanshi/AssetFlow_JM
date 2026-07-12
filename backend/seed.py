import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "assetflow.settings")
django.setup()


from accounts.models import Employee
from organization.models import Department, AssetCategory


def seed():
    # Create Departments
    it_dept, _ = Department.objects.get_or_create(name="IT", code="IT-01")
    hr_dept, _ = Department.objects.get_or_create(name="HR", code="HR-01")

    # Create Categories
    AssetCategory.objects.get_or_create(
        name="Laptops",
        type="Electronics",
        extra_fields={"warranty_months": "integer", "cpu": "string"},
    )
    AssetCategory.objects.get_or_create(
        name="Chairs", type="Furniture", extra_fields={"color": "string"}
    )

    # Create Users
    users_data = [
        {
            "email": "admin@assetflow.com",
            "name": "Admin User",
            "password": "Password1!",
            "role": "Admin",
            "department": it_dept,
        },
        {
            "email": "head@assetflow.com",
            "name": "Dept Head",
            "password": "Password1!",
            "role": "DepartmentHead",
            "department": it_dept,
        },
        {
            "email": "manager@assetflow.com",
            "name": "Asset Manager",
            "password": "Password1!",
            "role": "AssetManager",
            "department": hr_dept,
        },
        {
            "email": "employee@assetflow.com",
            "name": "Regular Employee",
            "password": "Password1!",
            "role": "Employee",
            "department": hr_dept,
        },
    ]

    for u in users_data:
        if not Employee.objects.filter(email=u["email"]).exists():
            if u["role"] == "Admin":
                user = Employee.objects.create_superuser(
                    email=u["email"],
                    password=u["password"],
                    name=u["name"],
                    role=u["role"],
                    department=u["department"],
                )
            else:
                user = Employee.objects.create_user(
                    email=u["email"],
                    password=u["password"],
                    name=u["name"],
                    role=u["role"],
                    department=u["department"],
                )
            print(f"Created user: {user.email}")
        else:
            print(f"User {u['email']} already exists.")

    # Set IT Dept head
    head_user = Employee.objects.get(email="head@assetflow.com")
    it_dept.head = head_user
    it_dept.save()
    print("Seed complete!")


if __name__ == "__main__":
    seed()
