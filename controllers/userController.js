import validator from "validator";
import bcrypt from "bcryptjs";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import paystack from "paystack";
import axios from "axios";

// API to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !password || !email) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // validating email format
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" });
    }
    // validating strong password
    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a strong password" });
    }

    // hashing user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API  for user login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      return res.json({ success: true, token });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

// API to get user profile data
// const getProfile = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     const userData = await userModel.findById(userId).select("-password");

//     res.json({ success: true, userData });
//   } catch (error) {
//     console.log(error);
//     return res.json({ success: false, message: error.message });
//   }
// };

// API to get user profile data
const getProfile = async (req, res) => {
  try {
    const userData = await userModel.findById(req.userId).select("-password");
    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API update user profile
// const updateProfile = async (req, res) => {
//   try {
//     const { userId, name, phone, address, dob, gender } = req.body;

//     const imageFile = req.file;

//     if (!name || !phone || !dob || !gender) {
//       return res.json({ success: false, message: "Data Missing" });
//     }
//     await userModel.findByIdAndUpdate(userId, {
//       name,
//       phone,
//       address: JSON.parse(address),
//       dob,
//       gender,
//     });
//     if (imageFile) {
//       // upload image to cloudinary
//       const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
//         resource_type: "image",
//       });
//       const imageURL = imageUpload.secure_url;
//       await userModel.findByIdAndUpdate(userId, { image: imageURL });
//     }
//     res.json({ success: true, message: "Profile Updated" });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, dob, gender } = req.body;
    const userId = req.userId;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.status(400).json({ success: false, message: "Data Missing" });
    }

    let parsedAddress = {};
    try {
      parsedAddress = address ? JSON.parse(address) : {};
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid address format" });
    }

    const updateData = {
      name,
      phone,
      address: parsedAddress,
      dob,
      gender,
    };

    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      console.log("Cloudinary upload result:", imageUpload);
      updateData.image = imageUpload.secure_url;
    }

    console.log("Updating user with ID:", userId);
    console.log("Update data:", updateData);

    const updatedUser = await userModel.findByIdAndUpdate(userId, updateData);
    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to book appointment
const bookAppointment = async (req, res) => {
  try {
    const { docId, slotDate, slotTime } = req.body;
    const userId = req.userId;
    const docData = await doctorModel.findById(docId).select("-password");
    if (!docData.available) {
      return res.json({ success: false, message: "Doctor not available" });
    }
    let slots_booked = docData.slots_booked;

    // checking for slot availability
    if (slots_booked[slotDate]) {
      ``;
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot not available" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }
    const userData = await userModel.findById(userId).select("-password");
    delete docData.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };
    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    // save new slots data in docData
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API  to get user appointments for frontend my-appointment page
const listAppointment = async (req, res) => {
  try {
    const userId = req.userId;
    const appointments = await appointmentModel.find({ userId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.userId;
    const appointmentData = await appointmentModel.findById(appointmentId);

    // verify appointment user
    if (appointmentData.userId !== userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    }
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });

    // releasing doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);
    let slots_booked = doctorData.slots_booked;
    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e !== slotTime
    );
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });
    res.json({ success: true, message: "Appointment cancelled" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// const paystackInstance = new paystack({
//   key_secret: process.env.PAYSTACK_TEST_SECRET_KEY,
// });

// API to make payment of appointment using paystack

// const paymentPaystack = async (req, res) => {
//   try {
//     const { appointmentId } = req.body;
//     const appointmentData = await appointmentModel.findById(appointmentId);
//     if (!appointmentData || appointmentData.cancelled) {
//       return res.json({
//         success: false,
//         message: "Appointment Cancelled or not found",
//       });
//     }

//creating options for paystack payment
// const options = {
//   amount: appointmentData.amount * 100,
//   currency: process.env.CURRENCY,
//   receipt: appointmentId,
// };

//creation of an order
//     const order = await paystackInstance.orders.create(options);
//     res.json({ success: true, order });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ success: false, message: error.message });

//   }
// };

// const axios = require("axios"); // Use axios to call Paystack API

const paymentPaystack = async (req, res) => {
  try {
    const { appointmentId, email } = req.body;

    // Fetch appointment data
    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData || appointmentData.cancelled) {
      return res.json({
        success: false,
        message: "Appointment Cancelled or not found",
      });
    }

    // Prepare payment data
    const paymentData = {
      email: email, // Required by Paystack
      amount: appointmentData.amount * 100, // Paystack expects amount in kobo
      currency: process.env.CURRENCY || "NGN",
      reference: `appt_${appointmentId}_${Date.now()}`,
      metadata: {
        appointmentId: appointmentId,
      },
      callback_url: `${process.env.CLIENT_URL}/paystack-verification`, // <== You control this page
    };

    // Call Paystack's transaction initialization endpoint
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Return the payment link to the frontend
    return res.json({
      success: true,
      authorization_url: response.data.data.authorization_url,
      access_code: response.data.data.access_code,
      reference: response.data.data.reference,
    });
  } catch (error) {
    console.error("Paystack error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Payment initialization failed",
    });
  }
};

//API to verify payment of paystack

const verifyPaystackPayment = async (req, res) => {
  const { reference } = req.query; // reference comes from Paystack

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`,
        },
      }
    );

    const paymentData = response.data.data;

    // ✅ Check if payment was successful
    if (paymentData.status === "success") {
      // You can update appointment status or save payment details here
      // Example:
      await appointmentModel.findByIdAndUpdate(
        paymentData.metadata.appointmentId,
        { payment: true }
      );

      return res.json({
        success: true,
        message: "Payment verified successfully",
        data: paymentData,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment not successful",
      });
    }
  } catch (error) {
    console.error("Verification error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentPaystack,
  verifyPaystackPayment,
};
