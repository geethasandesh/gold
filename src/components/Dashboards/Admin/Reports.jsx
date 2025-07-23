import React, { useEffect, useState } from 'react';
import Adminheader from './Adminheader';
import { db } from '../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function Reports() {
  const [tab, setTab] = useState('EXCHANGES');
  const [exchanges, setExchanges] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const exQ = query(collection(db, 'exchanges'), orderBy('createdAt', 'desc'));
      const exSnap = await getDocs(exQ);
      setExchanges(exSnap.docs.map(doc => doc.data()));
      const purQ = query(collection(db, 'purchases'), orderBy('createdAt', 'desc'));
      const purSnap = await getDocs(purQ);
      setPurchases(purSnap.docs.map(doc => doc.data()));
      const saleQ = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
      const saleSnap = await getDocs(saleQ);
      setSales(saleSnap.docs.map(doc => doc.data()));
      const cashQ = query(collection(db, 'cashmovements'), orderBy('createdAt', 'desc'));
      const cashSnap = await getDocs(cashQ);
      setCashMovements(cashSnap.docs.map(doc => doc.data()));
      setLoading(false);
    };
    fetchData();
  }, []);

  // Filtering logic for exchanges
  const filteredEx = exchanges.filter(ex => {
    const matchesSearch =
      search === '' ||
      Object.values(ex)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || ex.type === typeFilter;
    const matchesSource = sourceFilter === 'ALL' || ex.source === sourceFilter;
    return matchesSearch && matchesType && matchesSource;
  });

  // Filtering logic for purchases
  const filteredPur = purchases.filter(pur => {
    return (
      search === '' ||
      Object.values(pur)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  // Filtering logic for sales
  const filteredSales = sales.filter(sale => {
    return (
      search === '' ||
      Object.values(sale)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  // Filtering logic for cash movements
  const filteredCash = cashMovements.filter(mov => {
    return (
      search === '' ||
      Object.values(mov)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  // Export to Excel for exchanges
  const handleExportExcelEx = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEx);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exchanges');
    XLSX.writeFile(wb, 'exchanges_report.xlsx');
  };
  // Export to Excel for purchases
  const handleExportExcelPur = () => {
    const ws = XLSX.utils.json_to_sheet(filteredPur);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, 'purchases_report.xlsx');
  };
  // Export to PDF for exchanges
  const handleExportPDFEx = () => {
    const doc = new jsPDF();
    doc.text('Exchange Transactions Report', 14, 16);
    const tableColumn = [
      'Date', 'Employee', 'Type', 'Source', 'Name', 'Weight (gms)', 'Touch (%)', 'Less', 'Fine (gms)', 'Amount',
    ];
    const tableRows = filteredEx.map(ex => [
      ex.date, ex.employee, ex.type, ex.source, ex.name, ex.weight, ex.touch, ex.less, ex.fine, ex.amount,
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 22 });
    doc.save('exchanges_report.pdf');
  };
  // Export to PDF for purchases
  const handleExportPDFPur = () => {
    const doc = new jsPDF();
    doc.text('Purchases Report', 14, 16);
    const tableColumn = [
      'Date', 'Employee', 'Main Type', 'Sub Type', 'Name', 'Weight', 'Touch', 'Less', 'Fine', 'Rate', 'Amount', 'Payment', 'Mode',
    ];
    const tableRows = filteredPur.map(pur => [
      pur.date, pur.employee, pur.mainType, pur.subType, pur.name, pur.weight, pur.touch, pur.less, pur.fine, pur.rate, pur.amount, pur.paymentType, pur.cashMode,
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 22 });
    doc.save('purchases_report.pdf');
  };
  // Export to Excel for sales
  const handleExportExcelSales = () => {
    const ws = XLSX.utils.json_to_sheet(filteredSales);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, 'sales_report.xlsx');
  };
  // Export to PDF for sales
  const handleExportPDFSales = () => {
    const doc = new jsPDF();
    doc.text('Sales Report', 14, 16);
    const tableColumn = [
      'Date', 'Employee', 'Type', 'Name', 'Weight', 'Rate', 'Amount', 'Mode', 'Source',
    ];
    const tableRows = filteredSales.map(sale => [
      sale.date, sale.employee, sale.saleType, sale.name, sale.weight, sale.rate, sale.amount, sale.mode, sale.source,
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 22 });
    doc.save('sales_report.pdf');
  };
  // Export to Excel for cash movements
  const handleExportExcelCash = () => {
    const ws = XLSX.utils.json_to_sheet(filteredCash);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CashMovements');
    XLSX.writeFile(wb, 'cash_movements_report.xlsx');
  };
  // Export to PDF for cash movements
  const handleExportPDFCash = () => {
    const doc = new jsPDF();
    doc.text('Cash Movements Report', 14, 16);
    const tableColumn = [
      'Date', 'Type', 'Change', 'New Balance', 'Reason', 'By',
    ];
    const tableRows = filteredCash.map(mov => [
      mov.date, mov.type, mov.change, mov.newBalance, mov.reason, mov.by,
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 22 });
    doc.save('cash_movements_report.pdf');
  };

  return (
    <>
      <Adminheader />
      <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-yellow-50 to-yellow-200 py-8 px-2">
        <div className="w-full max-w-6xl bg-white/90 rounded-2xl shadow-xl p-8 border border-yellow-100 mt-8">
          <div className="flex gap-4 mb-6">
            <button onClick={() => setTab('EXCHANGES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'EXCHANGES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Exchanges</button>
            <button onClick={() => setTab('PURCHASES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'PURCHASES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Purchases</button>
            <button onClick={() => setTab('SALES')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'SALES' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Sales</button>
            <button onClick={() => setTab('CASH')} className={`px-6 py-2 rounded-lg font-bold ${tab === 'CASH' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-700'}`}>Cash Movements</button>
          </div>
          <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
              />
              {tab === 'EXCHANGES' && (
                <>
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="ALL">All Types</option>
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                  </select>
                  <select
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="ALL">All Sources</option>
                    <option value="LOCAL GOLD">Local Gold</option>
                    <option value="BANK GOLD">Bank Gold</option>
                    <option value="LOCAL SILVER">Local Silver</option>
                    <option value="KAMAL SILVER">Kamal Silver</option>
                  </select>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {tab === 'EXCHANGES' ? (
                <>
                  <button onClick={handleExportExcelEx} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow">Export to Excel</button>
                  <button onClick={handleExportPDFEx} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Export to PDF</button>
                </>
              ) : tab === 'PURCHASES' ? (
                <>
                  <button onClick={handleExportExcelPur} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow">Export to Excel</button>
                  <button onClick={handleExportPDFPur} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Export to PDF</button>
                </>
              ) : tab === 'SALES' ? (
                <>
                  <button onClick={handleExportExcelSales} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow">Export to Excel</button>
                  <button onClick={handleExportPDFSales} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Export to PDF</button>
                </>
              ) : (
                <>
                  <button onClick={handleExportExcelCash} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow">Export to Excel</button>
                  <button onClick={handleExportPDFCash} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow">Export to PDF</button>
                </>
              )}
            </div>
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : tab === 'EXCHANGES' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Employee</th>
                    <th className="px-4 py-2 border">Type</th>
                    <th className="px-4 py-2 border">Source</th>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Weight (gms)</th>
                    <th className="px-4 py-2 border">Touch (%)</th>
                    <th className="px-4 py-2 border">Less</th>
                    <th className="px-4 py-2 border">Fine (gms)</th>
                    <th className="px-4 py-2 border">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEx.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-4">No transactions found.</td></tr>
                  ) : (
                    filteredEx.map((ex, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{ex.date}</td>
                        <td className="px-4 py-2 border">{ex.employee}</td>
                        <td className="px-4 py-2 border">{ex.type}</td>
                        <td className="px-4 py-2 border">{ex.source}</td>
                        <td className="px-4 py-2 border">{ex.name}</td>
                        <td className="px-4 py-2 border">{ex.weight}</td>
                        <td className="px-4 py-2 border">{ex.touch}</td>
                        <td className="px-4 py-2 border">{ex.less}</td>
                        <td className="px-4 py-2 border">{ex.fine}</td>
                        <td className="px-4 py-2 border font-bold">{ex.amount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'PURCHASES' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Employee</th>
                    <th className="px-4 py-2 border">Main Type</th>
                    <th className="px-4 py-2 border">Sub Type</th>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Weight</th>
                    <th className="px-4 py-2 border">Touch</th>
                    <th className="px-4 py-2 border">Less</th>
                    <th className="px-4 py-2 border">Fine</th>
                    <th className="px-4 py-2 border">Rate</th>
                    <th className="px-4 py-2 border">Amount</th>
                    <th className="px-4 py-2 border">Payment</th>
                    <th className="px-4 py-2 border">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPur.length === 0 ? (
                    <tr><td colSpan={13} className="text-center py-4">No purchases found.</td></tr>
                  ) : (
                    filteredPur.map((pur, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{pur.date}</td>
                        <td className="px-4 py-2 border">{pur.employee}</td>
                        <td className="px-4 py-2 border">{pur.mainType}</td>
                        <td className="px-4 py-2 border">{pur.subType}</td>
                        <td className="px-4 py-2 border">{pur.name}</td>
                        <td className="px-4 py-2 border">{pur.weight}</td>
                        <td className="px-4 py-2 border">{pur.touch}</td>
                        <td className="px-4 py-2 border">{pur.less}</td>
                        <td className="px-4 py-2 border">{pur.fine}</td>
                        <td className="px-4 py-2 border">{pur.rate}</td>
                        <td className="px-4 py-2 border font-bold">{pur.amount}</td>
                        <td className="px-4 py-2 border">{pur.paymentType}</td>
                        <td className="px-4 py-2 border">{pur.cashMode}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'SALES' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Employee</th>
                    <th className="px-4 py-2 border">Type</th>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Weight</th>
                    <th className="px-4 py-2 border">Rate</th>
                    <th className="px-4 py-2 border">Amount</th>
                    <th className="px-4 py-2 border">Mode</th>
                    <th className="px-4 py-2 border">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-4">No sales found.</td></tr>
                  ) : (
                    filteredSales.map((sale, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{sale.date}</td>
                        <td className="px-4 py-2 border">{sale.employee}</td>
                        <td className="px-4 py-2 border">{sale.saleType}</td>
                        <td className="px-4 py-2 border">{sale.name}</td>
                        <td className="px-4 py-2 border">{sale.weight}</td>
                        <td className="px-4 py-2 border">{sale.rate}</td>
                        <td className="px-4 py-2 border font-bold">{sale.amount}</td>
                        <td className="px-4 py-2 border">{sale.mode}</td>
                        <td className="px-4 py-2 border">{sale.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <thead className="bg-yellow-100">
                  <tr>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Type</th>
                    <th className="px-4 py-2 border">Change</th>
                    <th className="px-4 py-2 border">New Balance</th>
                    <th className="px-4 py-2 border">Reason</th>
                    <th className="px-4 py-2 border">By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCash.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4">No cash movements found.</td></tr>
                  ) : (
                    filteredCash.map((mov, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 border">{mov.date}</td>
                        <td className="px-4 py-2 border">{mov.type}</td>
                        <td className="px-4 py-2 border font-bold">{mov.change}</td>
                        <td className="px-4 py-2 border">{mov.newBalance}</td>
                        <td className="px-4 py-2 border">{mov.reason}</td>
                        <td className="px-4 py-2 border">{mov.by}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Reports;
