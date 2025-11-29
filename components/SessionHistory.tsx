import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSessionsForUser } from '../services/userDataService';

export const SessionHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getSessionsForUser(currentUser.uid);
        setSessions(data as any[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  if (!currentUser) return <div className="text-sm text-gray-600">Sign in to view your saved sessions.</div>;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <h4 className="font-bold mb-2">Your Session History</h4>
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {!loading && sessions.length === 0 && <div className="text-sm text-gray-500">No saved sessions yet.</div>}
      <div className="space-y-2">
        {sessions.map(s => (
          <div key={s.id} className="p-3 border rounded-md flex items-start justify-between">
            <div>
              <div className="text-sm font-medium">{s.type}</div>
              <div className="text-xs text-gray-500">{s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : '—'}</div>
            </div>
            <div className="text-xs text-gray-600">View</div>
          </div>
        ))}
      </div>
    </div>
  );
};
