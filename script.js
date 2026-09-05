let allCourses = [];
let selectedSections = []; // Will store up to 5 section objects
const MAX_COURSES = 5;

// DOM Elements
const searchInput = document.getElementById('course-search');
const datalist = document.getElementById('course-list');
const addBtn = document.getElementById('add-course-btn');
const errorMsg = document.getElementById('error-msg');
const countSpan = document.getElementById('course-count');
const timetable = document.getElementById('timetable');
const recommendBtn = document.getElementById('recommend-btn');
const filterInput = document.getElementById('filter-input');
const recList = document.getElementById('recommendations-list');

// Initialize Timetable Grid (11 slots, Mon-Fri)
function initTimetable() {
    for (let slot = 0; slot < 11; slot++) {
        // Add time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `Slot ${slot}`;
        timetable.appendChild(timeLabel);

        // Add 5 empty cells for Mon-Fri
        for (let day = 0; day < 5; day++) {
            const cell = document.createElement('div');
            cell.id = `cell-${day}-${slot}`;
            timetable.appendChild(cell);
        }
    }
}

// Fetch Data
fetch('data.min.json')
    .then(response => response.json())
    .then(data => {
        allCourses = data.courses;
        populateDatalist();
    });

function populateDatalist() {
    allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = `${course.code} ${course.name}`;
        datalist.appendChild(option);
    });
}

// --- Schedule Conflict Logic ---

function getOccupiedSlots(sectionsArray) {
    let occupied = new Set();
    sectionsArray.forEach(sec => {
        sec.schedule.forEach(sch => {
            // Check if valid day (0-4 is Mon-Fri) and valid duration
            if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
                for (let i = 0; i < sch.duration; i++) {
                    occupied.add(`${sch.day}-${sch.start + i}`);
                }
            }
        });
    });
    return occupied;
}

function hasConflict(candidateSchedule, currentOccupiedSet) {
    for (let sch of candidateSchedule) {
        if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
            for (let i = 0; i < sch.duration; i++) {
                if (currentOccupiedSet.has(`${sch.day}-${sch.start + i}`)) {
                    return true; // Conflict found
                }
            }
        }
    }
    return false;
}

// --- Adding and Rendering Courses ---

addBtn.addEventListener('click', () => {
    errorMsg.textContent = '';
    
    addBtn.addEventListener('click', () => {
    errorMsg.textContent = '';
    
    if (selectedSections.length >= MAX_COURSES) {
        errorMsg.textContent = "You can only select up to 5 courses.";
        return;
    }

    const val = searchInput.value.trim();
    
    // Instead of splitting by space, find the course whose code matches the beginning of the input
    const course = allCourses.find(c => val.startsWith(c.code));
        
    if (!course) {
        errorMsg.textContent = "Course not found.";
        return;
    }

    // Grab the first section of the first class type for simplicity
    const sectionToadd = course.classes[0].sections[0];
    
    // Check internal conflict before adding
    const currentOccupied = getOccupiedSlots(selectedSections);
    if (hasConflict(sectionToadd.schedule, currentOccupied)) {
        errorMsg.textContent = "This course conflicts with your timetable!";
        return;
    }

    // Attach course code to the section object for easy rendering
    sectionToadd.displayCode = courseCode;
    selectedSections.push(sectionToadd);
    
    searchInput.value = '';
    updateTimetableUI();
});

function updateTimetableUI() {
    countSpan.textContent = selectedSections.length;
    
    // Clear timetable cells
    for(let day=0; day<5; day++) {
        for(let slot=0; slot<11; slot++) {
            const cell = document.getElementById(`cell-${day}-${slot}`);
            cell.innerHTML = '';
            cell.className = '';
        }
    }

    // Draw selected courses
    selectedSections.forEach((sec, index) => {
        sec.schedule.forEach(sch => {
            if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
                for (let i = 0; i < sch.duration; i++) {
                    const cell = document.getElementById(`cell-${sch.day}-${sch.start + i}`);
                    if (cell) {
                        cell.className = 'course-block';
                        cell.innerHTML = `<span>${sec.displayCode}</span>`;
                        // Click to remove
                        cell.onclick = () => removeCourse(index);
                    }
                }
            }
        });
    });
}

function removeCourse(index) {
    selectedSections.splice(index, 1);
    updateTimetableUI();
    recList.innerHTML = '<p>Select courses and click "Recommend" to see non-conflicting options here.</p>'; // Reset recommendations
}

// --- Recommendations and Filtering ---

let currentRecommendations = [];

recommendBtn.addEventListener('click', () => {
    const currentOccupied = getOccupiedSlots(selectedSections);
    currentRecommendations = [];

    // Look for courses where at least ONE section doesn't conflict
    allCourses.forEach(course => {
        // Skip if already in timetable
        if (selectedSections.some(s => s.displayCode === course.code)) return;

        let hasNonConflictingSection = false;
        
        course.classes.forEach(cls => {
            cls.sections.forEach(sec => {
                if (!hasConflict(sec.schedule, currentOccupied)) {
                    hasNonConflictingSection = true;
                }
            });
        });

        if (hasNonConflictingSection) {
            currentRecommendations.push(course);
        }
    });

    renderRecommendations();
});

filterInput.addEventListener('input', renderRecommendations);

function renderRecommendations() {
    recList.innerHTML = '';
    const filterText = filterInput.value.trim().toLowerCase();

    const filtered = currentRecommendations.filter(c => 
        c.code.toLowerCase().includes(filterText) || 
        c.name.toLowerCase().includes(filterText)
    );

    if (filtered.length === 0) {
        recList.innerHTML = '<p>No non-conflicting courses found.</p>';
        return;
    }

    filtered.forEach(course => {
        const div = document.createElement('div');
        div.className = 'rec-item';
        div.innerHTML = `
            <h4>${course.code}</h4>
            <p>${course.name}</p>
        `;
        recList.appendChild(div);
    });
}

// Init layout
initTimetable();
