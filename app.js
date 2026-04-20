/* Simple calendar app with filters, create/register, persistence */
(() => {
  const topics = ["US History","World History","Civil War","Ancient","1700s","Constitution","Revolution","Medieval","Renaissance"];
  const lengths = [30,45,60,90,120];
  const friends = [
    {id:'f1',name:'Sailing Jane'},
    {id:'f2',name:'Calico Jack'},
    {id:'f3',name:'BlackHat Bob'},
    {id:'f4',name:'Dead Eyed Dana'}
  ];

  // DOM
  const monthYearEl = document.getElementById('monthYear');
  const calendarEl = document.getElementById('calendar');
  const topicFiltersEl = document.getElementById('topicFilters');
  const lengthFiltersEl = document.getElementById('lengthFilters');
  const friendFiltersEl = document.getElementById('friendFilters');
  const createBtn = document.getElementById('createSessionBtn');
  const modal = document.getElementById('modal');
  const eventForm = document.getElementById('eventForm');
  const topicSelect = document.getElementById('topicSelect');
  const friendsListEl = document.getElementById('friendsList');
  const eventTemplate = document.getElementById('eventTemplate');
  const prevMonth = document.getElementById('prevMonth');
  const nextMonth = document.getElementById('nextMonth');
  const prevYear = document.getElementById('prevYear');
  const nextYear = document.getElementById('nextYear');
  const monthSelect = document.getElementById('monthSelect');

  // State
  let viewDate = new Date(); // current month view
  let events = loadEvents();
  let filters = {
    topics: new Set(),
    lengths: new Set(),
    friends: new Set()
  };

  // init
  function init(){
    renderFilterChips();
    populateTopicSelect();
    renderCalendar();
    attachHandlers();
  }

  function attachHandlers(){
    createBtn.addEventListener('click', openCreateModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    eventForm.addEventListener('submit', onSaveEvent);
    prevMonth.addEventListener('click', ()=>changeMonth(-1));
    nextMonth.addEventListener('click', ()=>changeMonth(1));
    prevYear.addEventListener('click', ()=>changeYear(-1));
    nextYear.addEventListener('click', ()=>changeYear(1));
    monthSelect.addEventListener('change', onMonthSelect);
    calendarEl.addEventListener('click', onCalendarClick);
  }

  function renderFilterChips(){
    // topics
    topicFiltersEl.innerHTML = '';
    topics.forEach(t=>{
      const div = document.createElement('div');
      div.className='chip';
      div.innerHTML = `<span>${t}</span><input type="checkbox" data-topic="${t}" />`;
      topicFiltersEl.appendChild(div);
      div.querySelector('input').addEventListener('change', e=>{
        toggleFilter('topics', t, e.target.checked);
      });
    });

    // lengths
    lengthFiltersEl.innerHTML = '';
    lengths.forEach(l=>{
      const div = document.createElement('div');
      div.className='chip';
      div.innerHTML = `<span>${l} min</span><input type="checkbox" data-length="${l}" />`;
      lengthFiltersEl.appendChild(div);
      div.querySelector('input').addEventListener('change', e=>{
        toggleFilter('lengths', l, e.target.checked);
      });
    });

    // friends
    friendFiltersEl.innerHTML = '';
    friends.forEach(f=>{
      const div = document.createElement('div');
      div.className='chip';
      div.innerHTML = `<span>${f.name}</span><input type="checkbox" data-friend="${f.id}" />`;
      friendFiltersEl.appendChild(div);
      div.querySelector('input').addEventListener('change', e=>{
        toggleFilter('friends', f.id, e.target.checked);
      });
    });
  }

  function toggleFilter(key, value, checked){
    if(checked) filters[key].add(value);
    else filters[key].delete(value);
    renderCalendar();
  }

  function populateTopicSelect(){
    topicSelect.innerHTML = topics.map(t=>`<option value="${t}">${t}</option>`).join('');
    friendsListEl.innerHTML = friends.map(f=>{
      return `<label class="friend-checkbox"><input type="checkbox" name="friend" value="${f.id}">${f.name}</label>`;
    }).join('');
  }

  function openCreateModal(){
    modal.setAttribute('aria-hidden','false');
    // default date to viewDate's first day
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    eventForm.date.value = d.toISOString().slice(0,10);
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    eventForm.reset();
  }

  function onSaveEvent(e){
    e.preventDefault();
    const form = new FormData(eventForm);
    const title = form.get('title');
    const date = form.get('date');
    const start = form.get('start');
    const length = parseInt(form.get('length'),10);
    const topic = form.get('topic');
    const invited = Array.from(eventForm.querySelectorAll('input[name="friend"]:checked')).map(i=>i.value);

    const id = 'ev_' + Date.now();
    const startDate = new Date(`${date}T${start}`);
    const ev = {
      id, title, start: startDate.toISOString(), length, topic, invited, attendees: []
    };
    events.push(ev);
    saveEvents();
    closeModal();
    renderCalendar();
  }

  function onMonthSelect(e){
    const selectedMonth = parseInt(e.target.value);
    viewDate = new Date(viewDate.getFullYear(), selectedMonth, 1);
    renderCalendar();
  }

  function toggleRegister(evId){
    const ev = events.find(x=>x.id===evId);
    if(!ev) return;
    // simulate current user id 'me'
    const me = 'me';
    const idx = ev.attendees.indexOf(me);
    if(idx>=0) ev.attendees.splice(idx,1);
    else ev.attendees.push(me);
    saveEvents();
    renderCalendar();
  }
   
  function changeMonth(delta){
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+delta, 1);
    renderCalendar();
  }
  function changeYear(delta){
    viewDate = new Date(viewDate.getFullYear()+delta, viewDate.getMonth(), 1);
    renderCalendar();
  }

  function renderCalendar(){
    // header
    const monthName = viewDate.toLocaleString(undefined,{month:'long'});
    monthYearEl.textContent = `${monthName} ${viewDate.getFullYear()}`;

    // Set the correct month in the dropdown
    monthSelect.value = viewDate.getMonth();

    // weekdays
    calendarEl.innerHTML = '';
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const wd = document.createElement('div');
    wd.className='weekdays';
    weekdays.forEach(d=>{
      const w = document.createElement('div'); w.className='weekday'; w.textContent=d; wd.appendChild(w);
    });
    calendarEl.appendChild(wd);

    // grid
    const grid = document.createElement('div'); grid.className='grid';
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0).getDate();

    // previous month's tail
    const prevMonthDays = startDay;
    const prevMonthLast = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
    for(let i=prevMonthLast - prevMonthDays +1; i<=prevMonthLast; i++){
      const d = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, i);
      grid.appendChild(renderDayCell(d, true));
    }

    // current month
    for(let d=1; d<=daysInMonth; d++){
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      grid.appendChild(renderDayCell(date, false));
    }

    // next month fill to complete weeks (42 cells max)
    const totalCells = grid.children.length;
    const needed = (Math.ceil(totalCells/7)*7) - totalCells;
    for(let i=1;i<=needed;i++){
      const d = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, i);
      grid.appendChild(renderDayCell(d, true));
    }

    calendarEl.appendChild(grid);
  }

  function renderDayCell(date, otherMonth){
    const cell = document.createElement('div');
    cell.className = 'day' + (otherMonth ? ' other' : '');
    cell.dataset.date = date.toISOString().slice(0,10);

    const dateEl = document.createElement('div'); dateEl.className='date'; dateEl.textContent = date.getDate();
    cell.appendChild(dateEl);

    const eventsWrap = document.createElement('div'); eventsWrap.className='events';
    // find events on this date
    const dayEvents = events.filter(ev=>{
      const evDate = new Date(ev.start);
      return evDate.getFullYear()===date.getFullYear() && evDate.getMonth()===date.getMonth() && evDate.getDate()===date.getDate();
    });

    // apply filters
    const filtered = dayEvents.filter(ev=>{
      // topic filter
      if(filters.topics.size && !filters.topics.has(ev.topic)) return false;
      // length filter
      if(filters.lengths.size && !filters.lengths.has(ev.length)) return false;
      // friends filter: show only events where at least one friend in filter is attending or invited
      if(filters.friends.size){
        const intersects = ev.invited.concat(ev.attendees).some(id=>filters.friends.has(id));
        if(!intersects) return false;
      }
      return true;
    });

    filtered.sort((a,b)=>new Date(a.start)-new Date(b.start));

    filtered.forEach(ev=>{
      const tpl = eventTemplate.content.cloneNode(true);
      const evEl = tpl.querySelector('.event');
      tpl.querySelector('.event-title').textContent = ev.title;
      tpl.querySelector('.event-meta').textContent = `${ev.topic} • ${ev.length}m`;
      const btn = tpl.querySelector('.btn-register');
      btn.dataset.eventId = ev.id;
      btn.textContent = ev.attendees.includes('me') ? 'Registered' : 'Register';
      if(ev.attendees.includes('me')) evEl.classList.add('registered');
      
      // Add topic-based color classes
      if(ev.topic === 'Civil War') evEl.classList.add('civil-war');
      else if(ev.topic === 'Ancient') evEl.classList.add('ancient-study');
      else if(ev.topic === 'US History') evEl.classList.add('us-history');
      
      eventsWrap.appendChild(tpl);
    });

    cell.appendChild(eventsWrap);
    return cell;
  }

  function saveEvents(){
    localStorage.setItem('study_events_v1', JSON.stringify(events));
  }
  function loadEvents(){
    const raw = localStorage.getItem('study_events_v1');
    if(raw) return JSON.parse(raw);
    // seed with sample events
    const now = new Date();
    const sample = [
      {id:'s1',title:'Civil War Q&A', start: new Date(now.getFullYear(), now.getMonth(), 5, 18,0).toISOString(), length:60, topic:'Civil War', invited:['f1','f3'], attendees:[]},
      {id:'s2',title:'Ancient Empires Study', start: new Date(now.getFullYear(), now.getMonth(), 12, 16,0).toISOString(), length:90, topic:'Ancient', invited:['f2'], attendees:['me']},
      {id:'s3',title:'US History Review', start: new Date(now.getFullYear(), now.getMonth(), 22, 19,0).toISOString(), length:45, topic:'US History', invited:[], attendees:[]}
    ];
    return sample;
  }

  // expose for debugging (optional)
  window._studyApp = {events, topics, friends, renderCalendar};

  init();
})();
