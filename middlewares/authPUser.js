import jwt from "jsonwebtoken";

// user authetication middleware
// const authPUser = async (req, res, next) => {
//   try {
//     const { token } = req.headers;
//     if (!token) {
//       return res.json({
//         success: false,
//         message: "Not Authorized Login Again",
//       });
//     }
//     const token_decode = jwt.verify(token, process.env.JWT_SECRET);

//     req.body.userId = token_decode.id;
//     next();
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

// export default authPUser;

const authPUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Missing or invalid token.",
      });
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer"
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Decoded token:", decoded); // Should show { id: "..." }

    req.userId = decoded.id;
    next();
  } catch (error) {
    console.log("Auth error:", error.message);
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export default authPUser;
