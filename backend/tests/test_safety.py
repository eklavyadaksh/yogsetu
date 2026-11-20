import pytest
from app.services.safety import check_medical_safety


def test_safety_clean_inputs():
    safe_cases = [
        "Daily morning stretch for desk fatigue",
        "Kamar mein halka sa khinchaav rehta hai",
        "Gentle relaxation before sleep",
        "30 minutes morning mobility routine for homemaker",
        "Stiffness after sitting for 6 hours"
    ]
    for text in safe_cases:
        is_safe, reason = check_medical_safety(text)
        assert is_safe is True, f"Expected safe for '{text}' but got: {reason}"
        assert reason is None


def test_safety_emergency_keywords_english():
    danger_cases = [
        "I have severe chest pain and breathlessness",
        "Had recent surgery 2 weeks ago",
        "Sudden unbearable back pain when bending",
        "I experienced fainting blackouts yesterday",
        "Leg has numbness and loss of sensation",
        "Running high fever since yesterday"
    ]
    for text in danger_cases:
        is_safe, reason = check_medical_safety(text)
        assert is_safe is False, f"Expected danger for '{text}'"
        assert reason is not None


def test_safety_emergency_keywords_hindi_hinglish():
    danger_cases = [
        "Seene mein dard ho raha hai aur sans phul rahi hai",
        "Tez dard ho raha hai kamar mein",
        "Garbhavastha chal rahi hai 3rd month",
        "Hal hi mein operation hua hai",
        "Chakkar aakar behosh ho gaya tha",
        "Haath pair sunn pad gaye hain",
        "छाती में दर्द और सांस लेने में तकलीफ",
        "तेज़ बुखार है"
    ]
    for text in danger_cases:
        is_safe, reason = check_medical_safety(text)
        assert is_safe is False, f"Expected danger for '{text}'"
        assert reason is not None
