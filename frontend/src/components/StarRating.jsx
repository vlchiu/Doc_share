import { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

function StarRating({ avgScore, totalRatings, userScore, onRate, readonly = false }) {
  const [hovered, setHovered] = useState(0);

  const display = hovered || userScore || 0;

  return (
    <div className="flex items-center gap-3">
      {/* Star Icons */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (readonly ? Math.round(avgScore || 0) : display);
          return (
            <motion.button
              key={star}
              type="button"
              disabled={readonly}
              whileHover={!readonly ? { scale: 1.2 } : {}}
              whileTap={!readonly ? { scale: 0.9 } : {}}
              onClick={() => !readonly && onRate && onRate(star)}
              onMouseEnter={() => !readonly && setHovered(star)}
              onMouseLeave={() => !readonly && setHovered(0)}
              className={`p-0.5 border-0 bg-transparent transition-colors ${
                readonly ? 'cursor-default' : 'cursor-pointer'
              }`}
              aria-label={`Đánh giá ${star} sao`}
            >
              <Star
                className={`w-4 h-4 transition-colors ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                    : 'fill-slate-100 text-slate-300'
                }`}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Numerical score & total ratings */}
      <span className="text-xs font-semibold text-slate-500">
        {avgScore ? (
          <>
            <span className="font-extrabold text-slate-900">{avgScore.toFixed(1)}</span> / 5.0{' '}
            <span className="text-slate-400 font-normal">({totalRatings} đánh giá)</span>
          </>
        ) : (
          <span className="text-slate-400">Chưa có đánh giá</span>
        )}
      </span>

      {!readonly && userScore && (
        <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          ✓ Đã đánh giá {userScore}★
        </span>
      )}
    </div>
  );
}

export default StarRating;
