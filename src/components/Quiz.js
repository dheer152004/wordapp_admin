import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function Quiz() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchQuizData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, statsRes, historyRes] = await Promise.all([
        api.get('/quiz/status'),
        api.get('/quiz/stats'),
        api.get('/quiz/history?page=0&size=10')
      ]);
      setStatus(statusRes.data);
      setStats(statsRes.data);
      setHistory(historyRes.data.content || []);
      
      if (!statusRes.data.completedToday) {
        const quizRes = await api.get('/quiz/today');
        setQuestions(quizRes.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  const handleAnswer = (questionId, selectedOption) => {
    setAnswers({ ...answers, [questionId]: selectedOption });
  };

  const handleSubmit = async () => {
    const answerList = questions.map(q => ({
      questionId: q.questionId,
      selectedOption: answers[q.questionId],
      timeTakenMs: 5000
    }));

    try {
      const response = await api.post('/quiz/submit', { answers: answerList });
      setResult(response.data);
      fetchQuizData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{stats.totalQuizzes || 0}</div><div className="stat-label">Total Quizzes</div></div>
          <div className="stat-card"><div className="stat-value">{stats.averageScore || 0}%</div><div className="stat-label">Avg Score</div></div>
          <div className="stat-card"><div className="stat-value">{stats.totalXp || 0}</div><div className="stat-label">Total XP</div></div>
          <div className="stat-card"><div className="stat-value">{stats.currentStreak || 0}</div><div className="stat-label">Current Streak</div></div>
          <div className="stat-card"><div className="stat-value">Lvl {stats.level || 1}</div><div className="stat-label">Level</div></div>
        </div>
      )}

      {result && (
        <div className="card result-card">
          <h3>Quiz Results</h3>
          <p>Score: {result.score}/{result.totalPossible} ({result.percentage}%)</p>
          <p>XP Earned: {result.xpEarned}</p>
          <p>{result.message}</p>
          <button className="btn btn-primary" onClick={() => setResult(null)}>Close</button>
        </div>
      )}

      {status?.completedToday && !result && (
        <div className="card"><h3>You've already completed today's quiz!</h3><p>Come back tomorrow for more XP!</p></div>
      )}

      {!status?.completedToday && questions.length > 0 && !result && (
        <div className="card">
          <h3>Today's Quiz</h3>
          {questions.map((q, idx) => (
            <div key={q.questionId} className="question-card">
              <h4>{idx + 1}. What does "{q.word}" mean?</h4>
              <div className="options">
                {q.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  return (
                    <label key={optIdx}>
                      <input type="radio" name={`q${q.questionId}`} value={letter} onChange={() => handleAnswer(q.questionId, letter)} />
                      <strong>{letter}.</strong> {opt}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <button className="btn btn-primary" onClick={handleSubmit} disabled={Object.keys(answers).length !== questions.length}>Submit Quiz</button>
        </div>
      )}

      <div className="card">
        <h3>Quiz History</h3>
        <table>
          <thead><tr><th>Date</th><th>Score</th><th>XP</th></tr></thead>
          <tbody>
            {history.map(h => (
              <tr key={h.attemptId}>
                <td>{new Date(h.completedAt).toLocaleDateString()}</td>
                <td>{h.score}/{h.totalPossible} ({h.percentage}%)</td>
                <td>{h.xpEarned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Quiz;