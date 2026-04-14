#!/usr/bin/env python3
"""Name pools for generating realistic person names."""

import random

FIRST_NAMES = [
    "James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda",
    "David","Elizabeth","William","Barbara","Richard","Susan","Joseph","Jessica",
    "Thomas","Sarah","Christopher","Karen","Charles","Lisa","Daniel","Nancy",
    "Matthew","Betty","Anthony","Margaret","Mark","Sandra","Donald","Ashley",
    "Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle",
    "Kenneth","Carol","Kevin","Amanda","Brian","Dorothy","George","Melissa",
    "Timothy","Deborah","Ronald","Stephanie","Edward","Rebecca","Jason","Sharon",
    "Jeffrey","Laura","Ryan","Cynthia","Jacob","Kathleen","Gary","Amy",
    "Nicholas","Angela","Eric","Shirley","Jonathan","Anna","Stephen","Brenda",
    "Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen",
    "Benjamin","Samantha","Samuel","Katherine","Raymond","Christine","Gregory","Debra",
    "Frank","Rachel","Alexander","Carolyn","Patrick","Janet","Jack","Catherine",
    "Dennis","Maria","Jerry","Heather","Tyler","Diane","Aaron","Ruth",
    "Jose","Julie","Nathan","Olivia","Henry","Joyce","Douglas","Virginia",
    "Peter","Victoria","Zachary","Kelly","Kyle","Lauren","Noah","Christina",
    "Ethan","Joan","Jeremy","Evelyn","Walter","Judith","Christian","Megan",
    "Keith","Andrea","Roger","Cheryl","Terry","Hannah","Harry","Jacqueline",
    "Ralph","Martha","Sean","Gloria","Jesse","Teresa","Austin","Ann",
    "Dylan","Sara","Arthur","Madison","Lawrence","Frances","Albert","Kathryn",
    "Bryan","Janice","Joe","Jean","Jordan","Abigail","Billy","Alice",
    "Bruce","Judy","Gabriel","Sophia","Logan","Grace","Carl","Denise",
    "Roy","Amber","Eugene","Doris","Russell","Marilyn","Philip","Danielle",
    "Wayne","Beverly","Alan","Isabella","Louis","Diana",
    "Randy","Vincent","Liam","Charlotte","Mason","Marie",
    "Elijah","Kayla","Aiden","Alexis","Lucas","Lori",
]

LAST_NAMES = [
    "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
    "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
    "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
    "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
    "Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill",
    "Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell",
    "Mitchell","Carter","Roberts","Gomez","Phillips","Evans","Turner","Diaz",
    "Parker","Cruz","Edwards","Collins","Reyes","Stewart","Morris","Morales",
    "Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper","Peterson",
    "Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward",
    "Richardson","Watson","Brooks","Chavez","Wood","James","Bennett","Gray",
    "Mendoza","Ruiz","Hughes","Price","Alvarez","Castillo","Sanders","Patel",
    "Myers","Long","Ross","Foster","Jimenez","Powell","Jenkins","Perry",
    "Russell","Sullivan","Bell","Coleman","Butler","Henderson","Barnes","Gonzales",
    "Fisher","Vasquez","Simmons","Griffin","Aguilar","Morton","Hamilton","Graham",
    "Wallace","Woods","Cole","West","Jordan","Owens","Reynolds","Ellis",
    "Harrison","Gibson","McDonald","Alexander","Marshall","Ortega","Delgado","Burke",
]


def generate_person_name(used=None):
    """Generate a unique random person name. Returns (first, last)."""
    for _ in range(500):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        if used is None or (first, last) not in used:
            if used is not None:
                used.add((first, last))
            return first, last
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
