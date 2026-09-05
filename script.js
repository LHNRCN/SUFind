let allCourses = [];
let selectedCourses = []; 
let takenCoursesSet = new Set(); 
let manuallyExcludedSet = new Set(); 

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const TIMES = [
    "08:40 - 09:30", "09:40 - 10:30", "10:40 - 11:30",
    "11:40 - 12:30", "12:40 - 13:30", "13:40 - 14:30",
    "14:40 - 15:30", "15:40 - 16:30", "16:40 - 17:30",
    "17:40 - 18:30", "18:40 - 19:30"
];

// DOM Elements
const searchInput = document.getElementById('course-search');
const takenSearch = document.getElementById('taken-search');
const datalist = document.getElementById('course-list');
const addBtn = document.getElementById('add-course-btn');
const addTakenBtn = document.getElementById('add-taken-btn');
const takenList = document.getElementById('taken-list');
const excludedList = document.getElementById('excluded-list');
const hideGradCheckbox = document.getElementById('hide-grad-cb');
const hideFreshmanCheckbox = document.getElementById('hide-freshman-cb');
const errorMsg = document.getElementById('error-msg');
const countSpan = document.getElementById('course-count');
const timetable = document.getElementById('timetable');
const recommendBtn = document.getElementById('recommend-btn');
const filterInput = document.getElementById('filter-input');
const recList = document.getElementById('recommendations-list');

// Modal Elements
const modal = document.getElementById('section-modal');
const closeModal = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-course-title');
const modalContainer = document.getElementById('modal-sections-container');
const modalError = document.getElementById('modal-error-msg');
const confirmBtn = document.getElementById('confirm-add-btn');

let coursePendingAdd = null;

function initTimetable() {
    for (let slot = 0; slot < 11; slot++) {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = TIMES[slot];
        timetable.appendChild(timeLabel);

        for (let day = 0; day < 5; day++) {
            const cell = document.createElement('div');
            cell.id = `cell-${day}-${slot}`;
            timetable.appendChild(cell);
        }
    }
}

fetch('data.min.json')
    .then(response => response.json())
    .then(data => {
        allCourses = data.courses; 
        populateDatalist();
        updateExcludedUI();
    });

function isGradCourse(courseCode) {
    const parts = courseCode.split(' ');
    if (parts.length < 2) return false;
    return parseInt(parts[1][0], 10) >= 5; 
}

function isFreshmanCourse(courseCode) {
    const parts = courseCode.split(' ');
    if (parts.length < 2) return false;
    return parseInt(parts[1][0], 10) === 1; 
}

function populateDatalist() {
    datalist.innerHTML = '';
    const hideGrad = hideGradCheckbox.checked;

    allCourses.forEach(course => {
        if (hideGrad && isGradCourse(course.code)) return;
        if (takenCoursesSet.has(course.code)) return; 
        if (manuallyExcludedSet.has(course.code)) return;

        const option = document.createElement('option');
        option.value = `${course.code} ${course.name}`;
        datalist.appendChild(option);
    });
}

function updateExcludedUI() {
    const hideGrad = hideGradCheckbox.checked;
    excludedList.innerHTML = '';
    let excludedCount = 0;

    allCourses.forEach(course => {
        let isExcluded = false;
        let reason = '';
        let canRemove = false;

        // Note: Taken courses are shown on the left pane, so we don't duplicate them here.
        if (manuallyExcludedSet.has(course.code)) {
            isExcluded = true;
            reason = 'Manually Excluded';
            canRemove = true;
        } else if (hideGrad && isGradCourse(course.code)) {
            isExcluded = true;
            reason = 'Grad Level';
        } 

        if (isExcluded) {
            excludedCount++;
            const span = document.createElement('span');
            span.className = 'excluded-tag';
            
            if (canRemove) {
                span.innerHTML = `<strong>${course.code}</strong>&nbsp;(${reason}) <span class="remove-tag" onclick="removeExcluded('${course.code}')" style="margin-left:5px;">&times;</span>`;
            } else {
                span.innerHTML = `<strong>${course.code}</strong>&nbsp;(${reason})`;
            }
            excludedList.appendChild(span);
        }
    });

    if (excludedCount === 0) {
        excludedList.innerHTML = '<p class="empty-msg" style="margin:0; font-size:13px; color:#777;">No courses excluded.</p>';
    }
}

// Checkbox Logic
hideGradCheckbox.addEventListener('change', () => {
    populateDatalist();
    updateExcludedUI();
    if (currentRecommendations.length > 0) recommendBtn.click();
});

hideFreshmanCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        allCourses.forEach(c => {
            if (isFreshmanCourse(c.code)) takenCoursesSet.add(c.code);
        });
    } else {
        allCourses.forEach(c => {
            if (isFreshmanCourse(c.code)) takenCoursesSet.delete(c.code);
        });
    }
    renderTakenCourses();
    populateDatalist();
    if (currentRecommendations.length > 0) recommendBtn.click();
});

// Taken Courses Logic
addTakenBtn.addEventListener('click', () => {
    const val = takenSearch.value.trim().toUpperCase();
    const course = allCourses.find(c => val.startsWith(c.code.toUpperCase()));
    
    if (course) {
        takenCoursesSet.add(course.code);
        takenSearch.value = '';
        renderTakenCourses();
        populateDatalist();
    }
});

function renderTakenCourses() {
    takenList.innerHTML = '';
    takenCoursesSet.forEach(code => {
        const tag = document.createElement('span');
        tag.className = 'taken-tag';
        tag.innerHTML = `${code} <span class="remove-tag" onclick="removeTaken('${code}')">&times;</span>`;
        takenList.appendChild(tag);
    });
}

window.removeTaken = function(code) {
    takenCoursesSet.delete(code);
    renderTakenCourses();
    populateDatalist();
    if (currentRecommendations.length > 0) recommendBtn.click();
};

// Excluded Courses Logic
window.manuallyExclude = function(code) {
    manuallyExcludedSet.add(code);
    populateDatalist();
    updateExcludedUI();
    recommendBtn.click();
};

window.removeExcluded = function(code) {
    manuallyExcludedSet.delete(code);
    populateDatalist();
    updateExcludedUI();
    if (currentRecommendations.length > 0) recommendBtn.click();
};

// Schedule Conflict Logic
function getOccupiedSlots(coursesArray) {
    let occupied = new Set();
    coursesArray.forEach(courseBundle => {
        courseBundle.sections.forEach(sec => {
            sec.schedule.forEach(sch => {
                if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
                    for (let i = 0; i < sch.duration; i++) {
                        occupied.add(`${sch.day}-${sch.start + i}`);
                    }
                }
            });
        });
    });
    return occupied;
}

function hasConflict(candidateSchedule, currentOccupiedSet) {
    for (let sch of candidateSchedule) {
        if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
            for (let i = 0; i < sch.duration; i++) {
                if (currentOccupiedSet.has(`${sch.day}-${sch.start + i}`)) return true;
            }
        }
    }
    return false;
}

function formatSchedule(scheduleArray) {
    if (!scheduleArray || scheduleArray.length === 0) return "TBA";
    let formatted = scheduleArray.map(sch => {
        if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
            const startStr = TIMES[sch.start].split(' - ')[0];
            const endStr = TIMES[sch.start + sch.duration - 1].split(' - ')[1];
            return `${DAYS[sch.day]} ${startStr}-${endStr}`;
        }
        return "";
    }).filter(s => s !== "");
    
    return formatted.length > 0 ? formatted.join(', ') : "TBA";
}

function getTypeName(typeCode) {
    if (typeCode === "") return "Lecture";
    if (typeCode === "R") return "Recitation";
    if (typeCode === "L") return "Lab";
    if (typeCode === "D") return "Discussion";
    return "Other";
}

// Modal Interaction
addBtn.addEventListener('click', () => {
    errorMsg.textContent = '';
    const val = searchInput.value.trim().toUpperCase();
    coursePendingAdd = allCourses.find(c => val.startsWith(c.code.toUpperCase()));
        
    if (!coursePendingAdd) {
        errorMsg.textContent = "Course not found.";
        return;
    }

    if (selectedCourses.some(c => c.code === coursePendingAdd.code)) {
        errorMsg.textContent = "Course already added to timetable.";
        return;
    }

    modalTitle.textContent = `${coursePendingAdd.code} Sections`;
    modalContainer.innerHTML = '';
    modalError.textContent = '';

    coursePendingAdd.classes.forEach((cls, index) => {
        const typeName = getTypeName(cls.type);
        const groupDiv = document.createElement('div');
        groupDiv.className = 'section-group';
        
        const label = document.createElement('label');
        label.textContent = `Select ${typeName}:`;
        
        const select = document.createElement('select');
        select.className = 'section-dropdown';
        select.dataset.classIndex = index;
        
        cls.sections.forEach((sec, secIndex) => {
            const option = document.createElement('option');
            option.value = secIndex;
            option.textContent = `Gr. ${sec.group} | ${formatSchedule(sec.schedule)}`;
            select.appendChild(option);
        });

        groupDiv.appendChild(label);
        groupDiv.appendChild(select);
        modalContainer.appendChild(groupDiv);
    });

    modal.style.display = 'flex';
});

confirmBtn.addEventListener('click', () => {
    const dropdowns = document.querySelectorAll('.section-dropdown');
    let sectionsToAdd = [];
    let proposedOccupied = new Set();
    let internalConflict = false;
    let externalConflict = false;

    let currentOccupied = getOccupiedSlots(selectedCourses);

    dropdowns.forEach(dropdown => {
        const classIndex = dropdown.dataset.classIndex;
        const sectionIndex = dropdown.value;
        const sec = coursePendingAdd.classes[classIndex].sections[sectionIndex];
        
        sec.displayType = getTypeName(coursePendingAdd.classes[classIndex].type);
        sectionsToAdd.push(sec);

        sec.schedule.forEach(sch => {
            if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
                for (let i = 0; i < sch.duration; i++) {
                    const slotId = `${sch.day}-${sch.start + i}`;
                    if (proposedOccupied.has(slotId)) internalConflict = true;
                    if (currentOccupied.has(slotId)) externalConflict = true;
                    proposedOccupied.add(slotId);
                }
            }
        });
    });

    if (internalConflict) {
        modalError.textContent = "Error: The sections you selected conflict with each other.";
        return;
    }
    
    if (externalConflict) {
        modalError.textContent = "Error: A selected section conflicts with your current timetable.";
        return;
    }

    selectedCourses.push({
        code: coursePendingAdd.code,
        sections: sectionsToAdd
    });
    
    searchInput.value = '';
    modal.style.display = 'none';
    updateTimetableUI();
});

closeModal.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

function updateTimetableUI() {
    countSpan.textContent = selectedCourses.length;
    
    for(let day=0; day<5; day++) {
        for(let slot=0; slot<11; slot++) {
            const cell = document.getElementById(`cell-${day}-${slot}`);
            if(cell) {
                cell.innerHTML = '';
                cell.className = '';
            }
        }
    }

    selectedCourses.forEach((courseBundle, index) => {
        courseBundle.sections.forEach(sec => {
            sec.schedule.forEach(sch => {
                if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
                    for (let i = 0; i < sch.duration; i++) {
                        const cell = document.getElementById(`cell-${sch.day}-${sch.start + i}`);
                        if (cell) {
                            cell.className = 'course-block';
                            cell.innerHTML = `
                                <strong>${courseBundle.code}</strong>
                                <span>${sec.displayType} (${sec.group})</span>
                            `;
                            cell.onclick = () => removeCourse(index);
                        }
                    }
                }
            });
        });
    });
}

function removeCourse(index) {
    selectedCourses.splice(index, 1);
    updateTimetableUI();
    recList.innerHTML = '<p>Select courses and click "Recommend" to see non-conflicting options here.</p>';
}

// Recommendations logic
let currentRecommendations = [];

recommendBtn.addEventListener('click', () => {
    currentRecommendations = [];
    const hideGrad = hideGradCheckbox.checked;

    allCourses.forEach(course => {
        if (hideGrad && isGradCourse(course.code)) return;
        if (takenCoursesSet.has(course.code)) return;
        if (manuallyExcludedSet.has(course.code)) return;
        if (selectedCourses.some(c => c.code === course.code)) return;

        let currentOccupied = getOccupiedSlots(selectedCourses);
        let canFitAllTypes = true;

        course.classes.forEach(cls => {
            let hasValidSecForType = false;
            for (let sec of cls.sections) {
                if (!hasConflict(sec.schedule, currentOccupied)) {
                    hasValidSecForType = true;
                    break;
                }
            }
            if (!hasValidSecForType) canFitAllTypes = false;
        });

        if (canFitAllTypes) {
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
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        
        div.innerHTML = `
            <div>
                <h4>${course.code}</h4>
                <p>${course.name}</p>
            </div>
            <button class="exclude-btn" onclick="manuallyExclude('${course.code}')">Exclude</button>
        `;
        recList.appendChild(div);
    });
}

initTimetable();