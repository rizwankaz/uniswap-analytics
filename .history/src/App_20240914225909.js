import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { Container, Typography, Card, CardContent, Stack, CircularProgress } from '@mui/material';
import { Line, Bar } from 'react-chartjs-2';  // Import Bar and Line here
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
  Legend,
  BarElement,  // Import BarElement for Bar chart
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register ChartJS components
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
  Legend,
  BarElement  // Register BarElement for Bar chart
);

// Define the query for recent swaps
const SWAP_QUERY = gql`
  {
    swaps(first: 10000, orderBy: timestamp, orderDirection: desc) {
      id
      amountUSD
      timestamp
      token0 {
        symbol
      }
      token1 {
        symbol
      }
    }
  }
`;

// Define the query for token volume
const TOKEN_VOLUME_QUERY = gql`
  {
    tokens(first: 5, orderBy: volumeUSD, orderDirection: desc) {
      id
      symbol
      volumeUSD
    }
  }
`;

// Define the query for top pairs
const TOP_PAIRS_QUERY = gql`
  {
    pools(first: 5, orderBy: volumeUSD, orderDirection: desc) {
      id
      token0 {
        symbol
      }
      token1 {
        symbol
      }
      volumeUSD
    }
  }
`;

// Define the query for protocol statistics
const PROTOCOL_STATS_QUERY = gql`
  {
    uniswapDayDatas(first: 30, orderBy: date, orderDirection: desc) {
      date
      tvlUSD
      volumeUSD
      feesUSD
}
`;

function Swaps() {
  const { loading, error, data } = useQuery(SWAP_QUERY);

  if (loading) return <CircularProgress />;
  if (error) {
    console.error('Error fetching data:', error);
    return <Typography color="error">Error: {error.message}</Typography>;
  }

  // Prepare data for aggregation
  const swaps = data.swaps;

  // Aggregate every 100 swaps
  const aggregateData = [];
  for (let i = 0; i < swaps.length; i += 100) {
    const chunk = swaps.slice(i, i + 100);
    const totalAmountUSD = chunk.reduce((sum, swap) => sum + parseFloat(swap.amountUSD), 0);
    const startTime = new Date(parseInt(chunk[0].timestamp) * 1000);
    const endTime = new Date(parseInt(chunk[chunk.length - 1].timestamp) * 1000);

    aggregateData.push({
      x: startTime,
      y: totalAmountUSD,
      label: `${startTime.toLocaleString()} - ${endTime.toLocaleString()}`
    });
  }

  // Prepare aggregated data for chart
  const chartData = {
    datasets: [
      {
        label: 'Amount USD (Aggregated Every 100 Swaps)',
        data: aggregateData,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
      },
    ],
  };

  // Chart options to format time and display a proper range
  const chartOptions = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          tooltipFormat: 'Pp',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM D'
          }
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Amount USD',
        },
        beginAtZero: true
      },
    },
  };

  // Limit to the 5 latest swaps
  const latestSwaps = swaps.slice(0, 5).map(swap => ({
    ...swap,
    timestamp: new Date(parseInt(swap.timestamp) * 1000).toLocaleString()
  }));

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Recent Swaps
      </Typography>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6">Swap Amounts Aggregated Every 100 Swaps</Typography>
            <Line data={chartData} options={chartOptions} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6">Recent Swap Details</Typography>
            {latestSwaps.map((swap) => (
              <Card key={swap.id} sx={{ marginBottom: 2 }}>
                <CardContent>
                  <Typography variant="body1">
                    {swap.token0.symbol}/{swap.token1.symbol}: {swap.amountUSD} USD
                  </Typography>
                  <Typography variant="body2">
                    Timestamp: {swap.timestamp}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

function TokenVolume() {
  const { loading, error, data } = useQuery(TOKEN_VOLUME_QUERY);

  if (loading) return <CircularProgress />;
  if (error) {
    console.error('Error fetching data:', error);
    return <Typography color="error">Error: {error.message}</Typography>;
  }

  // Prepare data for chart
  const tokens = data.tokens;
  const chartData = {
    labels: tokens.map(token => token.symbol),
    datasets: [
      {
        label: 'Volume USD',
        data: tokens.map(token => parseFloat(token.volumeUSD)),
        backgroundColor: 'rgba(153,102,255,0.2)',
        borderColor: 'rgba(153,102,255,1)',
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Volume USD',
        },
      },
    },
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Top 5 Tokens by Volume</Typography>
        <Bar data={chartData} options={chartOptions} />
      </CardContent>
    </Card>
  );
}

function TopPairs() {
  const { loading, error, data } = useQuery(TOP_PAIRS_QUERY);

  if (loading) return <CircularProgress />;
  if (error) {
    console.error('Error fetching data:', error);
    return <Typography color="error">Error: {error.message}</Typography>;
  }

  // Prepare data for chart
  const pairs = data.pools;
  const chartData = {
    labels: pairs.map(pair => `${pair.token0.symbol}/${pair.token1.symbol}`),
    datasets: [
      {
        label: 'Volume USD',
        data: pairs.map(pair => parseFloat(pair.volumeUSD)),
        backgroundColor: 'rgba(255,159,64,0.2)',
        borderColor: 'rgba(255,159,64,1)',
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Volume USD',
        },
      },
    },
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Top 5 Pairs by Volume</Typography>
        <Bar data={chartData} options={chartOptions} />
      </CardContent>
    </Card>
  );
}

function ProtocolStats() {
  const { loading, error, data } = useQuery(PROTOCOL_STATS_QUERY);

  if (loading) return <CircularProgress />;
  if (error) {
    console.error('Error fetching protocol stats:', error);
    return <Typography color="error">Error: {error.message}</Typography>;
  }

  const uniswapDayDatas = data.uniswapDayDatas;

  // Prepare data for the chart
  const chartData = {
    labels: uniswapDayDatas.map((entry) => new Date(entry.date * 1000).toLocaleDateString()), // Date formatting
    datasets: [
      {
        label: 'TVL USD',
        data: uniswapDayDatas.map((entry) => entry.tvlUSD),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      },
      {
        label: 'Volume USD',
        data: uniswapDayDatas.map((entry) => entry.volumeUSD),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: true,
      },
      {
        label: 'Fees USD',
        data: uniswapDayDatas.map((entry) => entry.feesUSD),
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Uniswap Protocol Stats (Last 30 Days)',
      },
    },
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Protocol Statistics (TVL, Volume, Fees)</Typography>
        <Line data={chartData} options={chartOptions} />
      </CardContent>
    </Card>
  );
}

function App() {
  return (
    <Container>
      <Stack spacing={4}>
        <Swaps />
        <TokenVolume />
        <TopPairs />
        <ProtocolStats />
      </Stack>
    </Container>
  );
}

export default App;