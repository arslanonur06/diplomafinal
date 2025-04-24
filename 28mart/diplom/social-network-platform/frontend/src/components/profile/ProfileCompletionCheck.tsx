import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoWarning } from 'react-icons/io5';

interface ProfileCompletionCheckProps {
  isProfileCompleted: boolean;
}

export const ProfileCompletionCheck: React.FC<ProfileCompletionCheckProps> = ({ isProfileCompleted }) => {
  const { t } = useTranslation();

  if (isProfileCompleted) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div className="flex items-center">
        <IoWarning className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Incomplete Profile
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              Please complete your profile to access all features
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
