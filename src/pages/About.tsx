import { motion } from 'motion/react';
import { Sparkles, Zap, ShieldCheck } from 'lucide-react';

export default function About() {
  return (
    <div className="py-16 sm:py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-6">
              Empowering Note-Takers with AI
            </h2>
            <div className="prose prose-lg prose-indigo text-slate-600">
              <p className="mb-6 leading-relaxed">
                Our Online Handwriting Recognizer uses state-of-the-art OCR and AI technologies to simplify the way you digitize handwritten content.
              </p>
              <p className="mb-6 leading-relaxed">
                Whether it's images, PDFs, camera captures, or drawings, we make it seamless, fast, and accurate.
              </p>
              <p className="leading-relaxed font-medium text-slate-800">
                Perfect for students, professionals, and anyone looking to save time and stay organized.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-indigo-100 p-2 rounded-lg text-indigo-600">
                  <Zap size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Lightning Fast</h4>
                  <p className="mt-1 text-sm text-slate-500">Results in seconds, not minutes.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">High Accuracy</h4>
                  <p className="mt-1 text-sm text-slate-500">Powered by advanced AI models.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg text-blue-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Secure & Private</h4>
                  <p className="mt-1 text-sm text-slate-500">Your data is never shared.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-12 lg:mt-0 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-200 to-purple-200 rounded-3xl transform rotate-3 scale-105 opacity-50 blur-lg"></div>
            <img
              className="relative rounded-3xl shadow-2xl object-cover w-full h-[500px]"
              src="https://picsum.photos/seed/workspace/800/1000"
              alt="Person working with handwritten notes"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
