"""
Pydantic schemas for request validation — Phase 0.2

All POST/PUT endpoints validate against these models.
Text fields accepting user content are sanitized via bleach.
"""

from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, EmailStr
import bleach


# ---------------------------------------------------------------------------
# Sanitization helper
# ---------------------------------------------------------------------------

def sanitize(value: str) -> str:
    """Strip all HTML tags from user-supplied text."""
    return bleach.clean(value, tags=[], strip=True).strip()


# ---------------------------------------------------------------------------
# Event schemas
# ---------------------------------------------------------------------------

class EventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(default='', max_length=5000)
    city: str = Field(..., min_length=1, max_length=100)
    address: str = Field(default='', max_length=300)
    coordinates: Optional[dict] = None
    hobby: str = Field(..., min_length=1, max_length=100)
    venue: str = Field(..., min_length=1, max_length=200)
    price: float = Field(default=0, ge=0)
    date: str = Field(..., min_length=1)  # ISO string from frontend
    maxParticipants: int = Field(..., ge=1)
    eventType: str = Field(default='solo')
    maxTicketsPerUser: Optional[int] = Field(default=None, ge=1)
    allowCancellation: bool = Field(default=True)
    mediaUrls: List[str] = Field(default_factory=list)

    # Phase 1: Paid Event Support
    is_paid: bool = Field(default=False)
    ticket_price: float = Field(default=0.0, ge=0)
    currency: str = Field(default='INR', max_length=3)
    max_tickets: Optional[int] = Field(default=None, ge=1)
    
    @field_validator('title', 'description')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize(v)

    @field_validator('eventType')
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if v not in ('solo', 'group'):
            raise ValueError('eventType must be "solo" or "group"')
        return v


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=100)
    description: Optional[str] = Field(default=None, max_length=5000)
    city: Optional[str] = Field(default=None, min_length=1, max_length=100)
    address: Optional[str] = Field(default=None, max_length=300)
    coordinates: Optional[dict] = None
    hobby: Optional[str] = Field(default=None, min_length=1, max_length=100)
    venue: Optional[str] = Field(default=None, min_length=1, max_length=200)
    price: Optional[float] = Field(default=None, ge=0)
    date: Optional[str] = Field(default=None, min_length=1)
    maxParticipants: Optional[int] = Field(default=None, ge=1)
    eventType: Optional[str] = Field(default=None)
    maxTicketsPerUser: Optional[int] = Field(default=None, ge=1)
    allowCancellation: Optional[bool] = None
    mediaUrls: Optional[List[str]] = None

    is_paid: Optional[bool] = None
    ticket_price: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, max_length=3)
    max_tickets: Optional[int] = Field(default=None, ge=1)

    @field_validator('title', 'description')
    @classmethod
    def sanitize_text(cls, v):
        if v is not None:
            return sanitize(v)
        return v

    @field_validator('eventType')
    @classmethod
    def validate_event_type(cls, v):
        if v is not None and v not in ('solo', 'group'):
            raise ValueError('eventType must be "solo" or "group"')
        return v


# ---------------------------------------------------------------------------
# Venue schemas
# ---------------------------------------------------------------------------

class VenueCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location: str = Field(..., min_length=1, max_length=500)
    city: str = Field(..., min_length=1, max_length=100)
    capacity: int = Field(..., gt=0)
    price_per_hour: float = Field(default=0, ge=0)
    description: str = Field(default='', max_length=5000)
    images: List[str] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    catering: str = Field(default='none', max_length=50)
    contact_email: str = Field(..., min_length=1, max_length=254)
    contact_phone: str = Field(..., min_length=1, max_length=20)
    website: str = Field(default='', max_length=500)

    @field_validator('description')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize(v)


class VenueUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    location: Optional[str] = Field(default=None, min_length=1, max_length=500)
    city: Optional[str] = Field(default=None, min_length=1, max_length=100)
    capacity: Optional[int] = Field(default=None, gt=0)
    price_per_hour: Optional[float] = Field(default=None, ge=0)
    description: Optional[str] = Field(default=None, max_length=5000)
    images: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    catering: Optional[str] = Field(default=None, max_length=50)
    contact_email: Optional[str] = Field(default=None, min_length=1, max_length=254)
    contact_phone: Optional[str] = Field(default=None, min_length=1, max_length=20)
    website: Optional[str] = Field(default=None, max_length=500)

    @field_validator('description')
    @classmethod
    def sanitize_text(cls, v):
        if v is not None:
            return sanitize(v)
        return v


# ---------------------------------------------------------------------------
# Booking schema
# ---------------------------------------------------------------------------

class BookingRequest(BaseModel):
    event_name: str = Field(..., min_length=1, max_length=200)
    date: str = Field(..., min_length=1)
    start_time: str = Field(..., min_length=1)
    end_time: str = Field(..., min_length=1)
    user_id: Optional[str] = None       # populated from auth if not sent
    user_email: Optional[str] = None     # populated from auth if not sent


# ---------------------------------------------------------------------------
# Comment schema
# ---------------------------------------------------------------------------

class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)

    @field_validator('text')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        return sanitize(v)


# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------

class UserSync(BaseModel):
    displayName: Optional[str] = Field(default=None, max_length=100)
    city: Optional[str] = Field(default=None, max_length=100)
    hobbies: Optional[List[str]] = None


class UserUpdate(BaseModel):
    displayName: Optional[str] = Field(default=None, max_length=100)
    city: Optional[str] = Field(default=None, max_length=100)
    hobbies: Optional[List[str]] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    avatarUrl: Optional[str] = Field(default=None, max_length=2000)

    @field_validator('bio')
    @classmethod
    def sanitize_bio(cls, v):
        if v is not None:
            return sanitize(v)
        return v


class VerificationRequest(BaseModel):
    documentUrl: str = Field(..., min_length=1, max_length=2000)
    type: str = Field(default='host')

    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ('host', 'venue'):
            raise ValueError('type must be "host" or "venue"')
        return v


class SubscribeRequest(BaseModel):
    type: str = Field(default='host')
    plan: str = Field(default='basic')

    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ('host', 'venue'):
            raise ValueError('type must be "host" or "venue"')
        return v


class WishlistAdd(BaseModel):
    targetId: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    name: Optional[str] = None
    details: Optional[dict] = Field(default_factory=dict)

    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ('host', 'place'):
            raise ValueError('type must be "host" or "place"')
        return v


# ---------------------------------------------------------------------------
# Phase 1 placeholders (define schema now, use later)
# ---------------------------------------------------------------------------

class PaymentInit(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = Field(default='INR', max_length=3)
    event_id: str = Field(..., min_length=1)

class PaymentVerify(BaseModel):
    razorpay_order_id: str = Field(..., min_length=1)
    razorpay_payment_id: str = Field(..., min_length=1)
    razorpay_signature: str = Field(..., min_length=1)

class RefundRequest(BaseModel):
    payment_id: str = Field(..., min_length=1)
    reason: str = Field(default='', max_length=500)
