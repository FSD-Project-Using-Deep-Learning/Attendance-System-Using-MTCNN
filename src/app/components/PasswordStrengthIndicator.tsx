import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasMinLength = password.length >= 8;

  const requirements = [
    { label: "At least 8 characters", met: hasMinLength },
    { label: "One uppercase letter (A-Z)", met: hasUpperCase },
    { label: "One lowercase letter (a-z)", met: hasLowerCase },
    { label: "One number (0-9)", met: hasNumber },
    { label: "One special character (!@#$...)", met: hasSpecialChar },
  ];

  const strength = requirements.filter((req) => req.met).length;
  const getStrengthColor = () => {
    if (strength <= 2) return "bg-gradient-to-r from-[#EF4444] to-[#F87171]";
    if (strength <= 3) return "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]";
    if (strength <= 4) return "bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]";
    return "bg-gradient-to-r from-[#10B981] to-[#34D399]";
  };

  const getStrengthText = () => {
    if (strength <= 2) return "Weak";
    if (strength <= 3) return "Fair";
    if (strength <= 4) return "Good";
    return "Strong";
  };

  return (
    <div className="space-y-3">
      {password && (
        <>
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-[#64748B] font-medium">Password Strength:</span>
              <span className={`font-bold ${
                strength <= 2 ? "text-[#EF4444]" :
                strength <= 3 ? "text-[#F59E0B]" :
                strength <= 4 ? "text-[#3B82F6]" :
                "text-[#10B981]"
              }`}>
                {getStrengthText()}
              </span>
            </div>
            <div className="w-full bg-[#E2E8F0] rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 shadow-sm ${getStrengthColor()}`}
                style={{ width: `${(strength / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {requirements.map((req, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-xs font-medium ${
                  req.met ? "text-[#10B981]" : "text-[#94A3B8]"
                }`}
              >
                {req.met ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
