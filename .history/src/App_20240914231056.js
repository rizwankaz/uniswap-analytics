import React, { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Container, Typography, Card, CardContent, Stack, CircularProgress, Skeleton, Alert } from '@mui/material';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, TimeScale, Tooltip, Legend, BarElement } from 'chart.js';
import 'chartjs-adapter-date-fns';
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
  const [page, setPage] = useState(0);
  const pageSize = 100;
  const { loading, error, data, fetchMore } = useQuery(SWAP_QUERY, {
    variables: { first: pageSize, skip: page * pageSize },
  });

  if (loading && !data) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;

  const swaps = data?.swaps || [];

  const aggregateData = swaps.map((swap, index) => ({
    x: new Date(parseInt(swap.timestamp) * 1000),
    y: parseFloat(swap.amountUSD),
    label: format(new Date(parseInt(swap.timestamp) * 1000), 'PPpp'),
  }));

  const chartData = {
    datasets: [
      {
        label: 'Amount USD',
        data: aggregateData,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
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
          tooltipFormat: 'PPpp',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'MMM d',
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
          text: 'Amount USD',
        },
        beginAtZero: true,
      },
    },
  };

  const latestSwaps = swaps.slice(0, 5).map(swap => ({
    ...swap,
    timestamp: format(new Date(parseInt(swap.timestamp) * 1000), 'PPpp'),
  }));

  const loadMore = () => {
    fetchMore({
      variables: {
        skip: (page + 1) * pageSize,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        setPage(page + 1);
        return {
          swaps: [...prev.swaps, ...fetchMoreResult.swaps],
        };
      },
    });
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Recent Swaps
      </Typography>
      <Stack spacing={3}>
        <Card>
          <CardContent style={{ height: '400px' }}>
            <Typography variant="h6">Swap Amounts</Typography>
            <Line data={chartData} options={chartOptions} aria-label="Swap amounts chart" />
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
            {loading ? (
              <CircularProgress />
            ) : (
              <button onClick={loadMore} aria-label="Load more swaps">
                Load More
              </button>
            )}
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
    <Card>
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