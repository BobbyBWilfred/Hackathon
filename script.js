function login() {
            const regNo = document.getElementById('regNo').value;
            const password = document.getElementById('password').value;

            fetch('/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regNo, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Login Successful!',
                        text: 'Welcome, Admin!',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        document.getElementById('login-container').classList.add('hidden');
                        document.getElementById('dashboard').classList.remove('hidden');
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Failed!',
                        text: data.message
                    });
                }
            });
        }

        function showSection(section) {
            document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
            document.getElementById(section).classList.remove('hidden');

            if (section === 'participants') loadParticipants();
            else if (section === 'teams') loadTeams();
            else if (section === 'attendance') loadAttendance();
            else if (section === 'scores') loadScores();
        }

        function loadParticipants() {
            fetch('/api/participants')
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('participants-list');
                list.innerHTML = data.map(participant => `
                    <tr>
                        <td>${participant.name}</td>
                        <td>${participant.regNo}</td>
                        <td>${participant.team}</td>
                    </tr>
                `).join('');
            });
        }

        function loadTeams() {
            fetch('/api/participants')
            .then(res => res.json())
            .then(data => {
                const teams = {};
                data.forEach(p => {
                    if (!teams[p.team]) teams[p.team] = [];
                    teams[p.team].push(p.name);
                });

                document.getElementById('teams-list').innerHTML = Object.entries(teams).map(([teamName, participants]) => `
    <div class="team-box">
        <h3>${teamName}</h3>
        <p>${participants.join(', ')}</p>
    </div>
`).join('');
            });
        }

        function loadAttendance() {
    fetch('/api/participants')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('attendance-list');
            list.innerHTML = data.map(p => {
                const attendance = p.attendance || { start: "", night: "", other: "" }; 
                return `
                    <tr>
                        <td>${p.name}</td>
                        <td>${p.regNo}</td>
                        <td>
                            <select id="morning-${p.regNo}" onchange="markAttendance('${p.regNo}', 'start', this.value)">
                                <option value="" disabled selected>Select</option>
                                <option value="true" ${attendance.start === true ? 'selected' : ''}>Present</option>
                                <option value="false" ${attendance.start === false ? 'selected' : ''}>Absent</option>
                            </select>
                        </td>
                        <td>
                            <select id="night-${p.regNo}" onchange="markAttendance('${p.regNo}', 'night', this.value)">
                                <option value="" disabled selected>Select</option>
                                <option value="true" ${attendance.night === true ? 'selected' : ''}>Present</option>
                                <option value="false" ${attendance.night === false ? 'selected' : ''}>Absent</option>
                            </select>
                        </td>
                        <td>
                            <select id="other-${p.regNo}" onchange="markAttendance('${p.regNo}', 'other', this.value)">
                                <option value="" disabled selected>Select</option>
                                <option value="true" ${attendance.other === true ? 'selected' : ''}>Present</option>
                                <option value="false" ${attendance.other === false ? 'selected' : ''}>Absent</option>
                            </select>
                        </td>
                    </tr>
                `;
            }).join('');
        });
}
function markAttendance(regNo, session, value) {
    const attendanceValue = value === "true";

    fetch('/api/mark-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNo, attendanceType: session, value: attendanceValue })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            Swal.fire({
                icon: attendanceValue ? 'success' : 'warning', 
                title: `Attendance Marked!`,
                text: `Marked ${session} attendance for ${regNo} as ${attendanceValue ? "Present" : "Absent"}`,
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: data.message
            });
        }
    })
    .catch(error => {
        console.error("Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Network Error!',
            text: 'Please try again later.'
        });
    });
}


    function loadScores() {
    fetch('/api/teams')
        .then(res => res.json())
        .then(teams => {
            const list = document.getElementById('scores-list');
            list.innerHTML = teams.map(team => {
                const scores = team.scores || {};

                return `
                    <tr>
                        <td class="team-name-col">${team.name}</td>
                        ${[1, 2, 3].map(i => {
                            const review = scores[`review${i}`] || {
                                "Innovation & Creativity": 0,
                                "Technical Implementation": 0,
                                "Functionality & Usability": 0,
                                "Business Potential & Impact": 0,
                                "Presentation & Pitch": 0,
                                total: 0
                            };
                            return `
                                <td class="review-col">
                                    <div class="review-cell">
                                        ${Object.keys(review).filter(key => key !== 'total').map(param => {

                                            const isConfirmed = scores[`review${i}`] && scores[`review${i}`][param + "Confirmed"];
                                            return `
                                                <div>
                                                    <label for="${param}-${team._id}-${i}">${param}:</label>
                                                    <input type="number" id="${param}-${team._id}-${i}" 
                                                        value="${review[param]}"  
                                                        ${isConfirmed ? 'disabled' : ''}  // Disable if confirmed
                                                        onfocus="this.dataset.originalValue = this.value"  
                                                        onblur="updateScore('${team._id}', ${i}, this, '${param}')">
                                                </div>`;
                                        }).join('')}
                                        <div>
                                            <label>Total:</label> <span id="total-${team._id}-${i}">${review.total}</span>
                                        </div>
                                    </div>
                                </td>`;
                        }).join('')}
                        <td class="final-score-col"><span id="final-${team._id}">${scores.final || 0}</span></td>
                    </tr>
                `;
            }).join('');
        })
            .catch(error => {
                console.error("Error loading scores:", error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load scores. Please try again later.' });
            });
    }



function updateScore(teamId, reviewNumber, inputElement, paramName) {
    Swal.fire({
        title: 'Confirm Score',
        text: `Are you sure you want to set the score for ${paramName}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            const review = {};
            for (const p of [
                "Innovation & Creativity",
                "Technical Implementation",
                "Functionality & Usability",
                "Business Potential & Impact",
                "Presentation & Pitch"
            ]) {
                const input = document.getElementById(`${p}-${teamId}-${reviewNumber}`);
                review[p] = parseFloat(input.value) || 0;
            }

            review.total = Object.values(review).reduce((sum, val) => sum + val, 0);

            fetch('/api/mark-scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, reviewNumber, scores: review, paramName }) 
            })
              .then(res => res.json())
              .then(data => {
                    if (data.success) {
                        document.getElementById(`total-${teamId}-${reviewNumber}`).textContent = review.total;
                        document.getElementById(`final-${teamId}`).textContent = data.finalScore;
                        inputElement.disabled = true;
                        fetch('/api/confirm-score', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teamId, reviewNumber, paramName })
                })
                .then(confirmRes => confirmRes.json())
                .then(confirmData => {
                    if (!confirmData.success) {
                        console.error("Error confirming score:", confirmData.message);
                    }
                })
                .catch(confirmError => {
                    console.error("Error confirming score:", confirmError);
                });

                        Swal.fire({
                            icon: 'success',
                            title: 'Score Updated',
                            text: 'Score saved successfully.',
                            timer: 1500,
                            showConfirmButton: false
                        });

                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: data.message || 'Failed to update score.'
                        });
                    }
                })
              .catch(error => {
                    console.error("Error updating score:", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'A network error occurred. Please try again later.'
                    });
                });
        }
    });
}

        function backToDashboard() {
            document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.container1').forEach(el => el.classList.add('hidden'));
            document.getElementById('dashboard').classList.remove('hidden');
        }
