import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async() =>{
  try{
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING as string)
    console.log("Database connection successful!"); 
  }catch(error){
    console.error("Database connection error:", error);
    process.exit(1);
  }
}
