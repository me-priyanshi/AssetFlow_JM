from rest_framework import serializers
from .models import Employee
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Employee
from django.contrib.auth.password_validation import validate_password

class EmployeeSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    class Meta:
        model = Employee
        fields = ['id', 'email', 'name', 'phone', 'password', 'role', 'status', 'department']
        read_only_fields = ['id', 'role', 'status', 'department']

    def create(self, validated_data):
        # Force role to Employee on signup regardless of input
        user = Employee.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            password=validated_data['password'],
            role='Employee'
        )
        if 'phone' in validated_data:
            user.phone = validated_data['phone']
            user.save()
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['name'] = user.name
        return token

