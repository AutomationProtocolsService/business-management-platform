import axios from "axios"; 
(async () => { 
  try { 
    // Configure axios to handle cookies
    axios.defaults.withCredentials = true;
    
    // First login to get a session cookie
    const loginResponse = await axios.post("http://localhost:5000/api/auth/login", {
      email: "admin@example.com",
      password: "adminpassword",
      tenantId: 1
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    console.log("Login successful:", loginResponse.data);
    
    // Then try to convert a quote to invoice
    const response = await axios.post("http://localhost:5000/api/quotes/1/convert-to-invoice");
    console.log("Successfully converted:", response.data);
  } catch (error) { 
    console.error("Error:", error.response?.data || error.message); 
  } 
})();
