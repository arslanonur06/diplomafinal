import React from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';

const VerifyEmailPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="rounded-full bg-indigo-100 dark:bg-indigo-900 w-20 h-20 flex items-center justify-center mx-auto">
          <FaEnvelope className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
        </div>

        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          Check Your Email
        </h2>

        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          We have sent a verification email to your address. Please check your inbox and follow the instructions to verify your account.
        </p>

        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Didn't receive the email?
          </p>
          <button
            type="button"
            className="text-indigo-600 hover:text-rose-500 dark:text-indigo-400 dark:hover:text-rose-400 font-medium"
          >
            Resend Email
          </button>
        </div>

        <div className="mt-8">
          <Link
            to="/login"
            className="text-sm font-medium text-indigo-600 hover:text-rose-500 dark:text-indigo-400 dark:hover:text-rose-400"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
