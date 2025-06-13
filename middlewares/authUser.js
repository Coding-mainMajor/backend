import jwt from "jsonwebtoken";

//user authetication middleware
// const authUser = async (req, res, next) => {
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

// export default authUser;

//user authetication middleware
const authUser = async (req, res, next) => {
  try {
    const { token } = req.headers;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized. Login Again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // ✅ Fix is here
    next();
  } catch (error) {
    console.log(error);
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export default authUser;
