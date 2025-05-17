import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

export default function Reports() {
  const [tabIndex, setTabIndex] = useState(0);
  const [ticketData, setTicketData] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [performanceData, setPerformanceData] = useState({ experts: [], agents: [] });
  const [timeData, setTimeData] = useState({ avgResponse: 0, avgResolution: 0 });
  const [loading, setLoading] = useState(false);

  const statusNameMap = {
    new: 'جدید',
    pending: 'در حال بررسی',
    answered: 'پاسخ داده شده',
    resolved: 'برطرف شد',
    confirmed: 'تایید شده',
    rejected: 'رد شده',
    'اعزام پول رسان': 'اعزام پول رسان',
    'نیاز به تعمیر': 'نیاز به تعمیر',
    'نیاز به رول': 'نیاز به رول',
    'نیاز به پول رسانی': 'نیاز به پول رسانی',
  };

  const ticketDataWithPersianStatus = ticketData.map(item => ({
    ...item,
    status: statusNameMap[item.status] || item.status
  }));

  useEffect(() => {
    // Fetch aggregated data for charts
    const fetchData = async () => {
      setLoading(true);
      try {
        const ticketsRes = await axios.get('/api/reports/tickets');
        setTicketData(ticketsRes.data);
        const devicesRes = await axios.get('/api/reports/devices');
        setDeviceData(devicesRes.data);
        const perfRes = await axios.get('/api/reports/performance');
        setPerformanceData(perfRes.data);
        const timeRes = await axios.get('/api/reports/time');
        setTimeData(timeRes.data);
      } catch (err) {
        console.error('Error fetching report data:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleChange = (e, newValue) => setTabIndex(newValue);

  return (
    <Box>
      <Typography variant="h5" mb={2}>گزارشات</Typography>
      <Tabs value={tabIndex} onChange={handleChange} aria-label="report tabs">
        <Tab label="تیکت‌ها" />
        <Tab label="دستگاه‌ها" />
        <Tab label="عملکرد" />
        <Tab label="میانگین زمان" />
      </Tabs>
      <Box mt={3}>
        {loading ? (
          <CircularProgress />
        ) : tabIndex === 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ticketDataWithPersianStatus} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        ) : tabIndex === 1 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={deviceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        ) : tabIndex === 2 ? (
          <Box>
            <Typography variant="h6" mb={2}>عملکرد کارشناسان</Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={performanceData.experts} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={[
                { category: 'پاسخ', time: timeData.avgResponse / 3600000 },
                { category: 'رفع', time: timeData.avgResolution / 3600000 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="category" />
              <YAxis label={{ value: 'ساعت', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={value => `${value.toFixed(2)} ساعت`} />
              <Legend />
              <Bar dataKey="time" fill="#ffc658" name="میانگین زمان (ساعت)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
} 