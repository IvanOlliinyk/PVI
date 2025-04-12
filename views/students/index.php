<?php
$currentPage = 'students';
include_once 'views/shared/header.php';
?>

  <h1>Students</h1>
  <div class="table-wrapper">
    <button class="add" onclick="addstudent()">Add student</button>
    <table class="table">
      <thead>
      <tr>
        <th>
          <label class="checkbox-container">
            <input type="checkbox" id="selectAll" class="custom-check"/>
            <span class="custom-check"></span>
            <span class="visually-hidden">Label for the input</span>
          </label>
        </th>
        <th>Group</th>
        <th>Name</th>
        <th>Gender</th>
        <th>Birthday</th>
        <th>Status</th>
        <th>Options</th>
      </tr>
      </thead>
      <tbody class="students-table">
      <?php if (isset($students) && !empty($students)): ?>
          <?php foreach ($students as $student): ?>
          <tr data-id="<?php echo $student->getId(); ?>">
            <td>
              <label class="checkbox-container">
                <input type="checkbox" class="student-select custom-check" data-id="<?php echo $student->getId(); ?>"/>
                <span class="custom-check"></span>
                <span class="visually-hidden">Select student</span>
              </label>
            </td>
            <td><?php echo htmlspecialchars($student->getStudentGroup()); ?></td>
            <td><?php echo htmlspecialchars($student->getFullName()); ?></td>
            <td><?php echo htmlspecialchars($student->getGender()); ?></td>
            <td><?php echo htmlspecialchars($student->getBirthday()); ?></td>
            <td><span class="status active">Active</span></td>
            <td>
              <button class="edit-btn" onclick="editStudent(<?php echo $student->getId(); ?>)">Edit</button>
              <button class="delete-btn" onclick="deleteStudentPrompt(<?php echo $student->getId(); ?>, '<?php echo htmlspecialchars($student->getFullName()); ?>')">Delete</button>
            </td>
          </tr>
          <?php endforeach; ?>
      <?php else: ?>
        <tr>
          <td colspan="7">No students found</td>
        </tr>
      <?php endif; ?>
      </tbody>
    </table>
  </div>

  <!-- Попап для підтвердження видалення -->
  <div id="deletePopup" class="delete-popup">
    <div class="delete-popup-content">
      <p id="deleteMessage"></p>
      <button onclick="confirmDelete()">Yes</button>
      <button onclick="closePopup()">No</button>
    </div>
  </div>

  <div class="table-pages">
    <button class="prev"><span class="visually-hidden">Previous</span></button>
    <button>1</button>
    <button>2</button>
    <button>3</button>
    <button>4</button>
    <button>5</button>
    <button class="next"><span class="visually-hidden">Next</span></button>
  </div>

  <div id="window">
    <div id="add-popup">
      <span id="popup-title">Add Student</span>
      <button id="close" onclick="addstudentclose()">Close</button>
      <div class="add-popup-content">
        <input type="hidden" id="student-id">
        <label for="group">Group</label>
        <select name="group" id="group">
          <option value="" selected disabled></option>
          <optgroup label="PZ-1*">
            <option value="PZ-11">PZ-11</option>
            <!-- Інші групи... -->
          </optgroup>
          <!-- Інші групи... -->
        </select>
        <label for="firstname">First name</label>
        <input type="text" id="firstname">
        <label for="lastname">Last name</label>
        <input type="text" id="lastname">
        <label for="gender">Gender</label>
        <select id="gender">
          <option value="" selected disabled></option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <label for="birthday">Birthday</label>
        <input type="date" id="birthday" value="">
      </div>
      <div class="add-popup-buttons">
        <button class="cancel" onclick="addstudentcancel()">Cancel</button>
        <button class="proceed" id="save-student-btn">Add</button>
      </div>
    </div>
  </div>

  <script>
    // JavaScript код для взаємодії з API
    const apiBaseUrl = '/api/students';
    let selectedStudentId = null;

    // Функція для відкриття попапа додавання студента
    function addstudent() {
      document.getElementById('popup-title').textContent = 'Add Student';
      document.getElementById('student-id').value = '';
      document.getElementById('firstname').value = '';
      document.getElementById('lastname').value = '';
      document.getElementById('gender').value = '';
      document.getElementById('group').value = '';
      document.getElementById('birthday').value = '';

      document.getElementById('save-student-btn').textContent = 'Add';
      document.getElementById('save-student-btn').onclick = createStudent;

      document.getElementById('window').style.display = 'flex';
    }

    // Інші JavaScript функції...
  </script>

<?php include_once 'views/shared/footer.php'; ?>