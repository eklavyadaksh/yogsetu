import re
from typing import Optional, Tuple

EMERGENCY_KEYWORD_PATTERNS = [
    # Chest pain
    r"\b(chest\s*pain|angina|heart\s*attack)\b",
    r"\b(seene?|chha?ti|chaati|seena)\s*(?:m(?:ein|e|ain|ẽ)?\s*)?dard\b",
    r"(सीने\s*में\s*दर्द|छाती\s*में\s*दर्द)",

    # Breathlessness
    r"\b(breathless(?:ness)?|shortness\s*of\s*breath|gasping|asthma\s*attack)\b",
    r"\b(sa+n?s\s*(?:lene\s*m(?:ein|e|ain)\s*takle+f|phu+lna|fulna|phul|nahi\s*aa\s*rahi)|dam\s*ghutna)\b",
    r"(सांस\s*फूलना|सांस\s*लेने\s*में\s*तकलीफ|दम\s*घुटना)",

    # Severe / sudden / unbearable pain
    r"\b(severe|sudden|acute|unbearable|excruciating)\s*(?:\w+\s*)?pain\b",
    r"\b(te+z|achanak|bahut\s*zyada|asahay)\s*(?:\w+\s*)?dard\b",
    r"(तेज़\s*दर्द|अचानक\s*दर्द|असहनीय\s*दर्द)",

    # Recent surgery or fracture
    r"\b(recent\s*surgery|just\s*operated|fracture|broken\s*bone|stitches|fresh\s*wound)\b",
    r"\b(operation\s*(?:hua|karwaya)|ta+nke|haddi\s*tu+t(?:i|na)|ta+za\s*chot)\b",
    r"(सर्जरी|ऑपरेशन|फ्रैक्चर|हड्डी\s*टूटना|ताज़ा\s*चोट)",

    # Pregnancy
    r"\b(pregnant|pregnancy|trimester)\b",
    r"\b(garbhavastha|garbhvati|pet\s*se\s*hu|hamal)\b",
    r"(गर्भावस्था|गर्भवती)",

    # Fainting
    r"\b(faint(?:ing|ed)?|unconscious|blackout|syncope)\b",
    r"\b(beho+sh(?:i)?|chakkar\s*aakar\s*girna)\b",
    r"(बेहोश|बेहोशी)",

    # Numbness
    r"\b(numbness|loss\s*of\s*sensation|paralysis)\b",
    r"\b(sunn\s*(?:pad(?:na|gaya)|hona)|ha+th\s*pair\s*sunn|jhunjhuni)\b",
    r"(सुन्न\s*पड़ना|सुन्न\s*होना|झुनझुनी)",

    # High fever
    r"\b(high\s*fever|chills\s*with\s*fever)\b",
    r"\b(te+z\s*bukha+r|bahut\s*bukhar)\b",
    r"(तेज़\s*बुखार)"
]


def check_medical_safety(text: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Scans input text for emergency/red-flag health symptoms in Hindi, English, and Hinglish.
    Returns: (is_safe: bool, flagged_reason: Optional[str])
    If is_safe is False, the user needs immediate doctor consultation.
    """
    if not text:
        return True, None

    normalized = text.lower()
    for pattern in EMERGENCY_KEYWORD_PATTERNS:
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            matched_phrase = match.group(0)
            reason = (
                f"Aapne '{matched_phrase}' darj kiya hai. Yeh lakshan turant doctor ya emergency dekhne "
                "ke yogya hain. Kripya bina doctori salah ke aasan shuru na karein."
            )
            return False, reason

    return True, None
