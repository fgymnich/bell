import React, { useEffect, useState } from 'react';

interface TimeEntry {
  id: string;
  project: string;
  task: string;
  info: string;
  start: string;
  end: string;
  durationHours: number;
}

const STORAGE_KEY = 'timeTrackerEntries';

export function TimeTracker() {
  const [project, setProject] = useState('');
  const [task, setTask] = useState('');
  const [info, setInfo] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TimeEntry[];
        if (Array.isArray(parsed)) {
          setEntries(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load time entries', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save time entries', error);
    }
  }, [entries]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isRunning) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRunning]);

  const projectOptions = Array.from(new Set(entries.map((e) => e.project).filter(Boolean))).sort();

  const taskOptions = Array.from(
    new Set(
      entries
        .filter((e) => !project || e.project === project)
        .map((e) => e.task)
        .filter(Boolean)
    )
  ).sort();

  const infoOptions = Array.from(
    new Set(
      entries
        .filter((e) => {
          if (project && task) {
            return e.project === project && e.task === task;
          }
          if (project && !task) {
            return e.project === project;
          }
          return true;
        })
        .map((e) => e.info)
        .filter(Boolean)
    )
  ).sort();

  const handleSelectProjectSummary = (projectName: string) => {
    if (!projectName || isRunning) {
      return;
    }
    setProject(projectName);
    setTask('');
    setInfo('');
  };

  const handleSelectTaskSummary = (projectName: string, taskName: string) => {
    if (!projectName || !taskName || isRunning) {
      return;
    }
    setProject(projectName);
    setTask(taskName);
    setInfo('');
  };

  const handleStart = () => {
    if (!project.trim() || !task.trim() || isRunning) {
      return;
    }
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
  };

  const handleStop = () => {
    if (!isRunning || startTime === null) {
      return;
    }
    const now = Date.now();
    const durationHours = (now - startTime) / 3600000;

    const newEntry: TimeEntry = {
      id: `${now}`,
      project: project.trim(),
      task: task.trim(),
      info: info.trim(),
      start: new Date(startTime).toISOString(),
      end: new Date(now).toISOString(),
      durationHours,
    };

    setEntries((prev) => [...prev, newEntry]);
    setIsRunning(false);
    setStartTime(null);
  };

  const totalByProject = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.project] = (acc[entry.project] || 0) + entry.durationHours;
    return acc;
  }, {});

  const totalByTask = entries.reduce<Record<string, number>>((acc, entry) => {
    const key = `${entry.project} :: ${entry.task}`;
    acc[key] = (acc[key] || 0) + entry.durationHours;
    return acc;
  }, {});

  const handleDeleteSession = (groupKey: string, sessionIndex: number, group: {
    project: string;
    task: string;
    info: string;
    sessions: { start: string; end: string; durationHours: number }[];
  }) => {
    const session = group.sessions[sessionIndex];
    if (!session) {
      return;
    }
    const confirmed = window.confirm(
      `Delete this session?\n\n` +
      `Project: ${group.project}\nTask: ${group.task}\nInfo: ${group.info || '(none)'}\n` +
      `From: ${new Date(session.start).toLocaleString()}\n` +
      `To:   ${new Date(session.end).toLocaleString()}`
    );
    if (!confirmed) {
      return;
    }

    setEntries((prev) =>
      prev.filter(
        (e) =>
          !(
            e.project === group.project &&
            e.task === group.task &&
            e.info === group.info &&
            e.start === session.start &&
            e.end === session.end
          )
      )
    );

    // Keep group expanded; derived data will refresh from updated entries
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: true,
    }));
  };

  const groupedSessions = entries.reduce<
    Record<
      string,
      {
        project: string;
        task: string;
        info: string;
        totalHours: number;
        count: number;
        sessions: { start: string; end: string; durationHours: number }[];
      }
    >
  >((acc, entry) => {
    const key = `${entry.project} :: ${entry.task} :: ${entry.info}`;
    if (!acc[key]) {
      acc[key] = {
        project: entry.project,
        task: entry.task,
        info: entry.info,
        totalHours: 0,
        count: 0,
        sessions: [],
      };
    }
    acc[key].totalHours += entry.durationHours;
    acc[key].count += 1;
    acc[key].sessions.push({
      start: entry.start,
      end: entry.end,
      durationHours: entry.durationHours,
    });
    return acc;
  }, {});

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  const handleSelectSessionGroup = (group: {
    project: string;
    task: string;
    info: string;
  }) => {
    if (isRunning) {
      return;
    }
    setProject(group.project || '');
    setTask(group.task || '');
    setInfo(group.info || '');
  };

  const exportCsv = (filename: string, header: string[], rows: (string | number)[][]) => {
    if (rows.length === 0) {
      return;
    }

    const escapeCell = (value: string) => {
      const needsQuotes = /[",\n]/.test(value);
      const escaped = value.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const csvLines = [
      header.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => escapeCell(String(cell)))
          .join(',')
      ),
    ];
    const csvContent = csvLines.join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="time-tracker-section">
      <div className="tracker-actions">
        <button
          type="button"
          className="config-toggle"
          onClick={() => {
            if (entries.length === 0) {
              return;
            }
            const header = ['Project', 'Task', 'Info', 'Start', 'End', 'Hours'];
            const rows = entries.map((entry) => [
              entry.project,
              entry.task,
              entry.info,
              new Date(entry.start).toISOString(),
              new Date(entry.end).toISOString(),
              entry.durationHours.toFixed(4),
            ]);
            exportCsv('bell-eight-time-entries.csv', header, rows);
          }}
        >
          Export db CSV 
        </button>
      </div>

      <div className="tracker-inputs">
        <div className="input-group">
          <label>Project:</label>
          <input
            type="text"
            list="project-options"
            disabled={isRunning}
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Project name"
          />
          <datalist id="project-options">
            {projectOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="input-group">
          <label>Task:</label>
          <input
            type="text"
            list="task-options"
            disabled={isRunning}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Task name"
          />
          <datalist id="task-options">
            {taskOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="input-group">
          <label>Info:</label>
          <input
            type="text"
            list="info-options"
            disabled={isRunning}
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Notes or details"
          />
          <datalist id="info-options">
            {infoOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="controls">
        <button
          className={`control-button ${isRunning ? 'stop' : 'start'}`}
          onClick={isRunning ? handleStop : handleStart}
          disabled={!isRunning && (!project.trim() || !task.trim())}
        >
          {isRunning ? 'Stop task' : 'Start task'}
        </button>
      </div>

      {isRunning && startTime !== null && (
        <div className="tracker-status">
          Tracking since {new Date(startTime).toLocaleTimeString()}
        </div>
      )}

      <div className="tracker-summary">
        <div className="tracker-summary-header">
          <h3>Hours by project</h3>
          {Object.keys(totalByProject).length > 0 && (
            <button
              type="button"
              className="config-toggle tracker-summary-button"
              onClick={() => {
                const header = ['Project', 'Total hours'];
                const rows = Object.entries(totalByProject).map(([name, hours]) => [
                  name,
                  hours.toFixed(4),
                ]);
                exportCsv('bell-eight-hours-by-project.csv', header, rows);
              }}
            >
              Export CSV
            </button>
          )}
        </div>
        {Object.keys(totalByProject).length === 0 ? (
          <p className="tracker-empty">No time recorded yet.</p>
        ) : (
          <ul>
            {Object.entries(totalByProject).map(([name, hours]) => (
              <li
                key={name}
                onClick={() => handleSelectProjectSummary(name)}
                className="tracker-clickable-row"
              >
                <span className="tracker-name">{name}</span>
                <span className="tracker-hours">{formatHours(hours)} h</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tracker-summary">
        <div className="tracker-summary-header">
          <h3>Hours by task</h3>
          {Object.keys(totalByTask).length > 0 && (
            <button
              type="button"
              className="config-toggle tracker-summary-button"
              onClick={() => {
                const header = ['Project', 'Task', 'Total hours'];
                const rows = Object.entries(totalByTask).map(([key, hours]) => {
                  const [projectName, taskName] = key.split(' :: ');
                  return [projectName, taskName, hours.toFixed(4)];
                });
                exportCsv('bell-eight-hours-by-task.csv', header, rows);
              }}
            >
              Export CSV
            </button>
          )}
        </div>
        {Object.keys(totalByTask).length === 0 ? (
          <p className="tracker-empty">No time recorded yet.</p>
        ) : (
          <ul>
            {Object.entries(totalByTask).map(([name, hours]) => {
              const [projectName, taskName] = name.split(' :: ');
              return (
                <li
                  key={name}
                  onClick={() => handleSelectTaskSummary(projectName, taskName)}
                  className="tracker-clickable-row"
                >
                  <span className="tracker-name">{name}</span>
                <span className="tracker-hours">{formatHours(hours)} h</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="tracker-history">
        <div className="tracker-summary-header">
          <h3>Sessions</h3>
          {entries.length > 0 && (
            <button
              type="button"
              className="config-toggle tracker-summary-button"
              onClick={() => {
                const header = ['Project', 'Task', 'Info', 'Sessions', 'Total hours'];
                const rows = Object.entries(groupedSessions).map(([, group]) => [
                  group.project,
                  group.task,
                  group.info,
                  group.count,
                  group.totalHours.toFixed(4),
                ]);
                exportCsv('bell-eight-sessions-summary.csv', header, rows);
              }}
            >
              Export CSV
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="tracker-empty">No sessions recorded yet.</p>
        ) : (
          <div className="tracker-history-list">
            {Object.entries(groupedSessions)
              .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
              .map(([key, group]) => (
                <div
                  key={key}
                  className="tracker-history-item tracker-clickable-row"
                  onClick={() => handleSelectSessionGroup(group)}
                >
                  <div className="tracker-history-main">
                    <span className="tracker-name">
                      {group.project} — {group.task}
                    </span>
                    <span className="tracker-hours">
                      {formatHours(group.totalHours)} h
                    </span>
                  </div>
                  <div className="tracker-history-meta">
                    {group.info && <span className="tracker-info">{group.info}</span>}
                    <div className="tracker-session-count-row">
                      <span>
                        {group.count} session{group.count !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        className="tracker-toggle-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedGroups((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                          }));
                        }}
                      >
                        {expandedGroups[key] ? '−' : '+'}
                      </button>
                    </div>
                  </div>
                  {expandedGroups[key] && (
                    <div className="tracker-session-details">
                      {group.sessions
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(a.start).getTime() - new Date(b.start).getTime()
                        )
                        .map((session, index) => (
                          <div key={index} className="tracker-session-detail-row">
                            <span>
                              {new Date(session.start).toLocaleString()} -{' '}
                              {new Date(session.end).toLocaleString()}
                            </span>
                            <div className="tracker-session-detail-right">
                              <span className="tracker-hours">
                                {formatHours(session.durationHours)} h
                              </span>
                              <button
                                type="button"
                                className="tracker-delete-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteSession(key, index, group);
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

