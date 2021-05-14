import './App.css';
import {
  AppBar,
  Button,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select
} from '@material-ui/core';
import { useEffect, useRef, useState } from 'react';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import axios from 'axios';
import moment from 'moment';

const server = axios.create({ baseURL: 'https://cdn-api.co-vin.in' });

function App() {
  const [searchBy, setSearchBy] = useState('pincode');
  const [states, setState] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState();
  const [pincode, setPincode] = useState('');
  const [time, setTime] = useState(1);
  const intervalId = useRef();
  const [isStart, setStart] = useState(false);

  useEffect(() => {
    fetchStates();
    requestNotification();
  }, []);

  const handleNotification = async (body) => {
    const greeting = new window.Notification(body);
    greeting.addEventListener('click', function () {
      window.open('https://selfregistration.cowin.gov.in/', '_blank');
    });
  };

  const requestNotification = async () => {
    if (Notification.permission !== 'granted') {
      let permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Allow notification to get notified when slot is available');
      }
    }
  };

  const fetchStates = async () => {
    try {
      setLoading(true);
      const res = await server.get('/api/v2/admin/location/states');
      if (res.status === 200) {
        setState(
          res.data.states.map((state) => ({
            title: state.state_name,
            value: state.state_id
          }))
        );
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      alert('Error in fetching state');
    }
  };

  const fetchDistric = async (value) => {
    if (value) {
      setLoading(true);
      const res = await server.get(`/api/v2/admin/location/districts/${value}`);
      if (res.status === 200) {
        setDistricts(
          res.data.districts.map((dist) => ({
            title: dist.district_name,
            value: dist.district_id
          }))
        );
      }
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    if (searchBy === 'pincode' && pincode.length !== 6) {
      alert('Invalid pincode');
      return;
    }
    if (searchBy !== 'pincode' && !selectedDistrict) {
      alert('Select district');
      return;
    }
    try {
      let date = moment().format('DD-MM-YYYY');
      let endUrl = `/api/v2/appointment/sessions/public/`;
      if (searchBy !== 'pincode') {
        endUrl += 'calendarByDistrict';
      } else {
        endUrl += 'calendarByPin';
      }

      const params = { date };
      if (searchBy === 'pincode') {
        params.pincode = pincode;
      } else {
        params.district_id = selectedDistrict;
      }
      const res = await server.get(endUrl, { params });
      if (res.status === 200) {
        return res.data.centers;
      } else {
        return false;
      }
    } catch (err) {
      alert('Something went wrong');
      return false;
    }
  };

  const startScheduler = async () => {
    setLoading(true);
    const res = await fetchSlots();
    if (res && res.length) {
      setStart(true);
      intervalId.current = setInterval(checkSlots, time * 60000);
    }
    setLoading(false);
  };

  const checkSlots = async () => {
    const res = await fetchSlots();
    res.map((center) => {
      if (center.sessions && center.sessions.length) {
        const isAvailable = center.sessions.some(
          (session) => session.min_age_limit < 45 && session.available_capacity
        );
        if (isAvailable) {
          alert(center.name);
          clearInterval(intervalId.current);
          handleNotification(
            `slot available in  ${center.name} ${center.address}`
          );
          var audio = new Audio(
            'https://m.tyroo.com/staging/audio/brand_215/2021/04/4489ebd1273c2ded5890f4fea37e5c81215.mp3'
          );
          audio.play();
          setTimeout(() => {
            audio.pause();
          }, 6000);
        }
      }
      return null;
    });
  };

  const disableButton = () => {
    if (loading) {
      return true;
    }
    if (searchBy === 'pincode' && pincode.length !== 6) {
      return true;
    }
    if (searchBy !== 'pincode' && !selectedDistrict) {
      return true;
    }
    return false;
  };

  function MacTest() {
    var mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

    if (mac) {
      return true;
    }
  }

  return (
    <div className='App'>
      <AppBar style={{ padding: 20, textTransform: 'capitalize' }}>
        Covid vaccine slot alert
      </AppBar>
      <p>Search by pincode or district</p>
      <RadioGroup
        value={searchBy}
        onChange={(e) => setSearchBy(e.target.value)}
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'row'
        }}
      >
        <FormControlLabel
          label='Pincode'
          control={
            <Radio
              disabled={isStart}
              value='pincode'
              style={{ margin: 10 }}
              color='primary'
            />
          }
        />
        <FormControlLabel
          label='District'
          control={
            <Radio
              disabled={isStart}
              value='district'
              style={{ margin: 10 }}
              color='primary'
            />
          }
        />
      </RadioGroup>
      {searchBy !== 'pincode' ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Autocomplete
            disabled={isStart}
            id='combo-box-demo'
            options={states}
            onChange={(e, value) => fetchDistric(value.value)}
            getOptionLabel={(option) => option.title}
            style={{ width: 300, margin: 10 }}
            loading={loading}
            renderInput={(params) => (
              <TextField {...params} label='States' variant='outlined' />
            )}
          />
          <Autocomplete
            disabled={isStart}
            id='combo-box-demo2'
            options={districts}
            loading={loading}
            getOptionLabel={(option) => option.title}
            onChange={(e, value) => setSelectedDistrict(value.value)}
            style={{ width: 300, margin: 10 }}
            renderInput={(params) => (
              <TextField {...params} label='District' variant='outlined' />
            )}
          />
        </div>
      ) : (
        <TextField
          value={pincode}
          type='number'
          disabled={isStart}
          onChange={(e) =>
            e.target.value.length <= 6 && setPincode(e.target.value)
          }
          label='Pincode'
        />
      )}
      <div>
        <Select
          style={{ width: 130, marginTop: 35 }}
          value={time}
          disabled={isStart}
          onChange={(e) => setTime(e.target.value)}
          label='Check for slot in every:'
        >
          <MenuItem value={1}>1 minute</MenuItem>
          <MenuItem value={2}>2 minute</MenuItem>
          <MenuItem value={5}>5 minute</MenuItem>
          <MenuItem value={10}>10 minute</MenuItem>
          <MenuItem value={30}>30 minute</MenuItem>
        </Select>
      </div>
      <div>
        <Button
          disabled={disableButton()}
          onClick={startScheduler}
          color='primary'
          style={{ marginTop: 10 }}
          variant='contained'
        >
          Start
        </Button>
        {isStart && (
          <Button
            onClick={() => {
              clearInterval(intervalId.current);
              setStart(false);
            }}
            color='primary'
            style={{ marginTop: 10, marginLeft: 10, background: 'red' }}
            variant='contained'
          >
            Stop
          </Button>
        )}
      </div>
      {isStart && <p>Scheduler started</p>}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {MacTest() && (
          <p
            style={{
              color: '#777',
              fontSize: 12,
              opacity: 0.8,
              textAlign: 'center',
              width: 250
            }}
          >
            For mac users make sure your chrome is allowed to send notifications
            as you will be notified when the slot will be available. (If not you
            can allow chrome notification from notification center)
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
