import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { Container, Typography, Card, CardContent, Stack, Skeleton, Alert } from '@mui/material';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, TimeScale, Tooltip, Legend, BarElement } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { fromUnixTime } from 'date-fns';
import PropTypes from 'prop-types';
import { format } from 'date-fns';

// Register ChartJS components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, TimeScale, Tooltip, Legend, BarElement);

// GraphQL queries
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

const TOKEN_VOLUME_QUERY = gql`
  {
    tokens(first: 5, orderBy: volumeUSD, orderDirection: desc) {
      id
      symbol
      volumeUSD
    }
  }
`;

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

const PROTOCOL_STATS_QUERY = gql`
  {
    uniswapDayDatas(first: 30, orderBy: date, orderDirection: desc) {
      date
      tvlUSD
      volumeUSD
      feesUSD
    }
  }
`;

// Error component
const ErrorMessage = ({ message }) => (
  <Alert severity="error" aria-live="assertive">
    Error: {message}
  </Alert>
);

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
};

// Loading component
const LoadingSkeleton = () => (
  <Stack spacing={1}>
    <Skeleton variant="rectangular" height={300} />
    <Skeleton variant="text" />
    <Skeleton variant="text" />
    <Skeleton variant="text" />
  </Stack>
);

function Swaps() {
  const { loading, error, data } = useQuery(SWAP_QUERY);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;

  const swaps = data?.swaps || [];

  // Aggregate swaps by 10-minute intervals
  const aggregatedData = swaps.reduce((acc, swap) => {
    const timestamp = fromUnixTime(parseInt(swap.timestamp));

    // Set the time to the nearest 10-minute interval
    const minutes = Math.floor(timestamp.getMinutes() / 10) * 10;
    const roundedTimestamp = new Date(timestamp.setMinutes(minutes, 0, 0));

    const timeKey = roundedTimestamp.getTime(); // Use timestamp in milliseconds as the key

    if (!acc[timeKey]) {
      acc[timeKey] = {
        totalAmount: 0,
        count: 0,
      };
    }

    acc[timeKey].totalAmount += parseFloat(swap.amountUSD);
    acc[timeKey].count += 1;

    return acc;
  }, {});

  // Convert aggregated data to chart format
  const chartData = Object.entries(aggregatedData).map(([timestamp, data]) => ({
    x: new Date(parseInt(timestamp)),
    y: data.totalAmount,
    count: data.count,
  })).sort((a, b) => a.x - b.x);

  const lineChartData = {
    datasets: [
      {
        label: '10-Minute Swap Volume (USD)',
        data: chartData,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          tooltipFormat: 'MMM d, HH:mm',
          displayFormats: {
            minute: 'MMM d, HH:mm',
          },
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Volume (USD)',
        },
        beginAtZero: true,
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const dataPoint = context.raw;
            return [
              `Volume: $${dataPoint.y.toFixed(2)}`,
              `Swaps: ${dataPoint.count}`,
            ];
          },
        },
      },
    },
  };

  // Get the 5 most recent swaps for display
  const latestSwaps = swaps.slice(0, 5).map(swap => ({
    ...swap,
    timestamp: format(fromUnixTime(parseInt(swap.timestamp)), 'PPpp'),
  }));

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Swap Activity
      </Typography>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              10-Minute Swap Volume
            </Typography>
            <div style={{ height: '400px' }}>
              <Line data={lineChartData} options={chartOptions} aria-label="10-minute swap volume chart" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Most Recent Swaps
            </Typography>
            {latestSwaps.map((swap) => (
              <Card key={swap.id} sx={{ marginBottom: 2 }}>
                <CardContent>
                  <Typography variant="body1">
                    {swap.token0.symbol}/{swap.token1.symbol}: ${parseFloat(swap.amountUSD).toFixed(2)}
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

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;

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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
      <CardContent style={{ height: '400px' }}>
        <Typography variant="h6">Top 5 Tokens by Volume</Typography>
        <Bar data={chartData} options={chartOptions} aria-label="Top 5 tokens by volume chart" />
      </CardContent>
    </Card>
  );
}

function TopPairs() {
  const { loading, error, data } = useQuery(TOP_PAIRS_QUERY);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;

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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
    <Card sx={{ padding: 2}}>
      <CardContent style={{ height: '400px' }}>
        <Typography variant="h6">Top 5 Pairs by Volume</Typography>
        <Bar data={chartData} options={chartOptions} aria-label="Top 5 pairs by volume chart" />
      </CardContent>
    </Card>
  );
}

function ProtocolStats() {
  const { loading, error, data } = useQuery(PROTOCOL_STATS_QUERY);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;

  const uniswapDayDatas = data.uniswapDayDatas;

  const labels = uniswapDayDatas.map((entry) => format(new Date(entry.date * 1000), 'MMM d'));

  const createChartData = (label, data, color) => ({
    labels,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: color.replace('1)', '0.2)'),
        fill: true,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'USD',
        },
      },
    },
  };

  const tvlData = createChartData(
    'Total Value Locked (USD)',
    uniswapDayDatas.map((entry) => entry.tvlUSD),
    'rgba(75, 192, 192, 1)'
  );

  const volumeData = createChartData(
    'Volume (USD)',
    uniswapDayDatas.map((entry) => entry.volumeUSD),
    'rgba(153, 102, 255, 1)'
  );

  const feesData = createChartData(
    'Fees (USD)',
    uniswapDayDatas.map((entry) => entry.feesUSD),
    'rgba(255, 159, 64, 1)'
  );

  return (
    <Stack spacing={3}>
      <Typography variant="h4" gutterBottom>
        Protocol Statistics (Last 30 Days)
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Total Value Locked (TVL)
          </Typography>
          <div style={{ height: '400px' }}>
            <Line data={tvlData} options={chartOptions} aria-label="Total Value Locked chart" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Volume
          </Typography>
          <div style={{ height: '400px' }}>
            <Line data={volumeData} options={chartOptions} aria-label="Volume chart" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Fees
          </Typography>
          <div style={{ height: '400px' }}>
            <Line data={feesData} options={chartOptions} aria-label="Fees chart" />
          </div>
        </CardContent>
      </Card>
    </Stack>
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