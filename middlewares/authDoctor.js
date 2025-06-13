import jwt from "jsonwebtoken";

// doctor authentication middleware
const authDoctor = async (req, res, next) => {
  try {
    const { dtoken } = req.headers;

    if (!dtoken) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized. Login Again.",
      });
    }

    const decoded = jwt.verify(dtoken, process.env.JWT_SECRET);
    req.docId = decoded.id; // ✅ Fix is here
    next();
  } catch (error) {
    console.log(error);
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export default authDoctor;
