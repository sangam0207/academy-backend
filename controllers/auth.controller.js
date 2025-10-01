import authService from "../services/auth.service.js";

export const signup = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;
    console.log(req.body);

    if (!name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    const data = await authService.register({ name, email, mobile });
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data,
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
