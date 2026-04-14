#!/usr/bin/env python3
"""Shared helper functions for mock data generators."""

import random
import string
from datetime import date, timedelta


# ── Date Helpers ──
MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"]
MONTH_ENDS = [
    "2025-01-31","2025-02-28","2025-03-31","2025-04-30",
    "2025-05-31","2025-06-30","2025-07-31","2025-08-31",
    "2025-09-30","2025-10-31","2025-11-30","2025-12-31",
]
MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
]


def random_phone():
    a = random.randint(200, 999)
    b = random.randint(200, 999)
    c = random.randint(1000, 9999)
    return f"{a}-{b}-{c}"


def random_email(first, last, domain=None):
    if not domain:
        domains = ["gmail.com","outlook.com","yahoo.com","hotmail.com","icloud.com"]
        domain = random.choice(domains)
    return f"{first.lower()}.{last.lower()}@{domain}"


def random_date_between(start, end):
    """Random date between two date objects, weekdays only."""
    delta = (end - start).days
    if delta <= 0:
        return start
    for _ in range(100):
        d = start + timedelta(days=random.randint(0, delta))
        if d.weekday() < 5:
            return d
    return start


def fmt(amount):
    """Format amount for CSV. Empty string if zero."""
    if amount == 0 or amount == "" or amount is None:
        return ""
    return f"{amount:.2f}"


def allocate_to_months(annual, weights=None):
    """Distribute annual total across 12 months proportionally.
    If weights is None, distributes equally.
    """
    if weights is None:
        weights = [1] * 12
    total_w = sum(weights)
    result = []
    running = 0.0
    for i in range(12):
        if i < 11:
            val = round(annual * weights[i] / total_w, 2)
            result.append(val)
            running += val
        else:
            result.append(round(annual - running, 2))
    return result
