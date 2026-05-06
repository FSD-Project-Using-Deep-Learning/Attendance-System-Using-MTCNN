import { useNavigate } from "react-router";
import { ArrowLeft, Scan, Phone, Mail, Quote } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const DEVELOPERS = [
  {
    name: "Prapthi Hegde",
    phone: "+91 89516 25773", // Placeholder
    email: "prapthih165@gmail.com",
    quote: "Innovation distinguishes between a leader and a follower.",
    image: "/developers/Prapthi.jpeg",
  },
  {
    name: "Preethi Deepak Javali",
    phone: "+91 96322 29063", // Placeholder
    email: "preethideepak2005@gmail.com",
    quote: "The best way to predict the future is to create it.",
    image: "/developers/Preethi.jpeg",
  },
  {
    name: "Prithvi Shenoy",
    phone: "+91 95384 24766", // Placeholder
    email: "prithvishenoy06@gmail.com",
    quote: "AI is the new electricity powering our tomorrow.",
    image: "/developers/Prithvi.jpeg",
  },
  {
    name: "Pratham M Prabhu",
    phone: "+91 94812 41277", // Placeholder
    email: "prathammprabhu5@gmail.com",
    quote: "Technology should simplify life, not complicate it.",
    image: "/developers/Pratham.JPG",
  }
];

export default function ContactPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center shadow-lg shadow-[#6366F1]/30">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl text-[#0F172A] font-bold">Contact Us</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl text-[#0F172A] mb-3 font-bold">
            Meet the Developers
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            The team behind the AI-Based Smart Attendance System
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {DEVELOPERS.map((dev) => (
            <div
              key={dev.name}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-lg transition-all"
            >
              <div className="h-48 bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl">
                  <ImageWithFallback
                    src={dev.image}
                    alt={dev.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl text-[#0F172A] mb-4 font-bold text-center">
                  {dev.name}
                </h3>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-sm text-[#475569]">
                    <Phone className="w-4 h-4 text-[#6366F1]" />
                    <span>{dev.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#475569]">
                    <Mail className="w-4 h-4 text-[#6366F1]" />
                    <span>{dev.email}</span>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                  <div className="flex items-start gap-2">
                    <Quote className="w-4 h-4 text-[#6366F1] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#64748B] italic">
                      "{dev.quote}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
