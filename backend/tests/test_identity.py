import pytest
from app.services.identity import normalize_identifier, validate_identifier


def test_normalize_email():
    ident, id_type = normalize_identifier("  User.Test@Gmail.COM  ")
    assert ident == "user.test@gmail.com"
    assert id_type == "email"
    assert validate_identifier("user.test@gmail.com") is True


def test_normalize_phone_with_country_code():
    ident, id_type = normalize_identifier("+91 98765 43210")
    assert ident == "9876543210"
    assert id_type == "phone"
    assert validate_identifier("+91 98765 43210") is True


def test_normalize_phone_with_leading_zero():
    ident, id_type = normalize_identifier("09876543210")
    assert ident == "9876543210"
    assert id_type == "phone"


def test_normalize_phone_plain_ten_digits():
    ident, id_type = normalize_identifier("9876543210")
    assert ident == "9876543210"
    assert id_type == "phone"


def test_invalid_identifiers():
    assert validate_identifier("notanemail") is False
    assert validate_identifier("123") is False
