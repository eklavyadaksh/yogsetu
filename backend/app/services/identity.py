import re
from typing import Tuple


def normalize_identifier(raw: str) -> Tuple[str, str]:
    """
    Normalizes a user or doctor identifier.
    Returns: (canonical_identifier, id_type) where id_type is 'email' or 'phone'.
    """
    cleaned = raw.strip()
    if "@" in cleaned:
        canonical = cleaned.lower()
        return canonical, "email"

    # For phone numbers: remove all non-digit characters
    digits = re.sub(r"\D", "", cleaned)
    # If Indian country code 91 is prepended to a 10-digit number (total 12 digits), strip 91
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    # If leading zero on a 11-digit number (e.g., 09876543210), strip the leading zero
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    return digits, "phone"


def validate_identifier(raw: str) -> bool:
    """Validates whether a raw string is a well-formed email address or valid phone number."""
    identifier, id_type = normalize_identifier(raw)
    if id_type == "email":
        return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", identifier))
    return len(identifier) >= 7
