// Helper functions to bridge chat.js and students.js
const chatHelpers = {
  // Function to get all students with proper error handling
  getAllStudentsForChat: async function() {
    try {
      // First try using studentsApi if available
      if (typeof studentsApi !== 'undefined' && studentsApi.getAllStudents) {
        console.log("Using studentsApi.getAllStudents()");
        return await studentsApi.getAllStudents();
      }

      // Fallback to direct API call
      console.log("Fallback: Fetching students directly from API");
      const response = await fetch('/api/student_api.php');
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        return result.data;
      } else {
        console.error("API returned error:", result);
        return [];
      }
    } catch (error) {
      console.error("Error fetching students for chat:", error);
      return [];
    }
  }
};

// Make chatHelpers globally available
window.chatHelpers = chatHelpers;
