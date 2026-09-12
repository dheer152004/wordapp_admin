// import React, { useState, useEffect } from 'react';
// import api from '../services/api';

// function BulkImport() {
//   const [categories, setCategories] = useState([]);
//   const [selectedCategory, setSelectedCategory] = useState('');
//   const [jsonData, setJsonData] = useState('');
//   const [result, setResult] = useState(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//   const fetchCategories = async () => {
//     try {
//       const response = await api.get('/admin/categories');
//       setCategories(response.data);
//     } catch (error) {
//       console.error('Error:', error);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const words = JSON.parse(jsonData);
//       const response = await api.post(`/admin/words/bulk/${selectedCategory}`, { words });
//       setResult({ success: true, data: response.data });
//     } catch (error) {
//       setResult({ success: false, error: error.response?.data?.message || error.message });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const exampleJson = `[
//   {
//     "word": "no cap",
//     "meaning": "For real, not lying",
//     "examples": ["No cap, that was amazing!"],
//     "wordImageUrl": "https://example.com/image.jpg"
//   }
// ]`;

//   return (
//     <div>
//       <div className="card-header"><h2>Bulk Import Words</h2></div>
//       <div className="card">
//         <form onSubmit={handleSubmit}>
//           <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} required>
//             <option value="">Select Category</option>
//             {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
//           </select>
//           <textarea value={jsonData} onChange={(e) => setJsonData(e.target.value)} rows={15} placeholder={exampleJson} required />
//           <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Importing...' : 'Import Words'}</button>
//         </form>
//       </div>
//       {result && (
//         <div className={`card ${result.success ? 'success' : 'error'}`}>
//           <h3>{result.success ? 'Import Successful!' : 'Import Failed'}</h3>
//           <p>{result.success ? result.data.message : result.error}</p>
//         </div>
//       )}
//     </div>
//   );
// }

// export default BulkImport;