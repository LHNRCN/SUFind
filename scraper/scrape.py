import requests
from bs4 import BeautifulSoup
import json

# Sabancı University BannerWeb Endpoints
BASE_URL = "https://suis.sabanciuniv.edu/prod/"
SEARCH_URL = BASE_URL + "bwckschd.p_get_crse_unsec"

def scrape_banner_data(term_code):
    """
    Scrapes course data from Sabancı University BannerWeb.
    """
    # Standard payload to query the dynamic schedule
    payload = {
        "term_in": term_code,
        "sel_subj": ["dummy", "CS", "MATH", "IF", "SPS", "NS", "PROJ", "ECON", "EE"], 
        "sel_day": "dummy",
        "sel_schd": "dummy",
        "sel_insm": "dummy",
        "sel_camp": "dummy",
        "sel_levl": "dummy",
        "sel_sess": "dummy",
        "sel_instr": "dummy",
        "sel_ptrm": "dummy",
        "sel_attr": "dummy",
        "sel_crse": "",
        "sel_title": "",
        "sel_from_cred": "",
        "sel_to_cred": "",
        "begin_hh": "0",
        "begin_mi": "0",
        "begin_ap": "a",
        "end_hh": "0",
        "end_mi": "0",
        "end_ap": "a"
    }

    print(f"Fetching course list for term {term_code}...")
    
    try:
        response = requests.post(SEARCH_URL, data=payload)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # ---------------------------------------------------------
        # TODO: Insert the specific HTML parsing logic from suchedule here.
        # You need to extract the courses and format them to match
        # the JSON structure below.
        # ---------------------------------------------------------
        
        # Example of the structured output expected by your JavaScript frontend:
        scraped_courses = [
            {
                "name": "Introduction to Computing",
                "code": "CS 201",
                "classes": [
                    {
                        "type": "",  # "" for Lecture, "R" for Recitation, "L" for Lab
                        "sections": [
                            {
                                "crn": "10218",
                                "group": "A",
                                "schedule": [
                                    {"day": 0, "start": 1, "duration": 2}, # Mon 09:40-11:30
                                    {"day": 2, "start": 2, "duration": 1}  # Wed 10:40-11:30
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
        
        # Export to the JSON file your frontend reads
        with open('data.min.json', 'w', encoding='utf-8') as f:
            json.dump({"courses": scraped_courses}, f, ensure_ascii=False, separators=(',', ':'))
        print("Scraping complete. Saved to data.min.json")
        
    except Exception as e:
        print(f"An error occurred during scraping: {e}")
        exit(1) # Ensure GitHub Actions correctly reports a failure if this crashes

if __name__ == "__main__":
    # Run scraper for the desired term code (e.g., 202601 for Fall 2026)
    scrape_banner_data("202601")