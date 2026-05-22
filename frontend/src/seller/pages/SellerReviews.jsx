import { useEffect, useState } from 'react';
import { sellerApi } from '../api/sellerClient';

export default function SellerReviews() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal]     = useState(0);
  const [avg, setAvg]         = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sellerApi.get('/store/reviews?limit=50').then(d => {
      const r = d.reviews || [];
      setReviews(r);
      setTotal(d.total || 0);
      setAvg(r.length ? (r.reduce((s,rv)=>s+rv.rating,0)/r.length).toFixed(1) : 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const dist = [5,4,3,2,1].map(s => ({
    stars: s,
    count: reviews.filter(r=>r.rating===s).length,
    pct: reviews.length ? Math.round(reviews.filter(r=>r.rating===s).length/reviews.length*100) : 0,
  }));

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-xl font-bold text-white mb-5">Avis clients</h2>
      {!loading && reviews.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 flex items-center gap-8">
          <div className="text-center">
            <div className="text-5xl font-extrabold text-white">{avg}</div>
            <div className="text-yellow-400 text-lg mt-1">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5-Math.round(avg))}</div>
            <div className="text-slate-500 text-xs mt-1">{total} avis</div>
          </div>
          <div className="flex-1 space-y-1.5">
            {dist.map(d => (
              <div key={d.stars} className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-4">{d.stars}★</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{width:`${d.pct}%`}} />
                </div>
                <span className="text-slate-500 w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading ? <div className="text-slate-500 text-center py-12">Chargement...</div>
        : reviews.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-5xl mb-3">⭐</div>
          <div className="text-slate-400 font-medium">Aucun avis pour l'instant</div>
          <div className="text-slate-600 text-sm mt-1">Encouragez vos clients à laisser des avis</div>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {r.user?.name?.[0]?.toUpperCase()||'?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-slate-200 font-medium text-sm">{r.user?.name}</span>
                    <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                    <span className="text-slate-600 text-xs">{new Date(r.createdAt).toLocaleDateString('fr-TN')}</span>
                  </div>
                  <div className="text-blue-400 text-xs mb-1 font-medium">{r.product?.title}</div>
                  <p className="text-slate-300 text-sm">{r.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
