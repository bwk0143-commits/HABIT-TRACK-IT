import { useEffect, useState } from "react";
import "./index.css";

const habits = [
  {
    title: "Morning Workout",
    icon: "🏃",
    image:
      "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=900&q=80",
    tasks: ["Exercise for 20 minutes", "Stretch for 5 minutes"],
    streak: 12,
  },
  {
    title: "Read Every Day",
    icon: "📚",
    image:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80",
    tasks: ["Read 10 pages", "Write one useful note"],
    streak: 8,
  },
  {
    title: "Drink Water",
    icon: "💧",
    image:
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=900&q=80",
    tasks: ["Drink 8 glasses", "Refill bottle at lunch"],
    streak: 15,
  },
  {
    title: "Sleep on Time",
    icon: "🌙",
    image:
      "https://images.unsplash.com/photo-1455642305367-68834a36c47e?auto=format&fit=crop&w=900&q=80",
    tasks: ["Avoid phone after 10 PM", "Sleep before 11 PM"],
    streak: 6,
  },
  {
    title: "Daily Meditation",
    icon: "🧘",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    tasks: ["Meditate for 10 minutes", "Take 3 mindful breaths"],
    streak: 10,
  },
];

export default function App() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % habits.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const move = (direction) => {
    setActive((current) => {
      return (current + direction + habits.length) % habits.length;
    });
  };

  return (
    <main className="app">
      <header>
        <p>BUILD A BETTER ROUTINE</p>
        <h1>My Daily Habits</h1>
      </header>

      <section className="carousel">
        {habits.map((habit, index) => {
          let difference = index - active;

          if (difference > habits.length / 2) difference -= habits.length;
          if (difference < -habits.length / 2) difference += habits.length;

          return (
            <article
              className={`habit-card ${difference === 0 ? "active" : ""}`}
              key={habit.title}
              style={{
                transform: `
                  translateX(${difference * 260}px)
                  translateZ(${Math.abs(difference) * -220}px)
                  rotateY(${difference * -30}deg)
                `,
                opacity: Math.abs(difference) > 2 ? 0 : 1,
                zIndex: habits.length - Math.abs(difference),
              }}
              onClick={() => setActive(index)}
            >
              <img src={habit.image} alt={habit.title} />

              <div className="overlay" />

              <div className="card-content">
                <span className="icon">{habit.icon}</span>

                <div className="habit-info">
                  <small>DAILY HABIT</small>
                  <h2>{habit.title}</h2>

                  <ul>
                    {habit.tasks.map((task, taskIndex) => (
                      <li key={task}>
                        <span>{taskIndex === 0 ? "✓" : ""}</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="streak">🔥 {habit.streak} days</div>
              </div>
            </article>
          );
        })}
      </section>

      <nav className="controls">
        <button onClick={() => move(-1)} aria-label="Previous habit">
          ←
        </button>

        <div className="dots">
          {habits.map((habit, index) => (
            <button
              key={habit.title}
              className={index === active ? "selected" : ""}
              onClick={() => setActive(index)}
              aria-label={`Show ${habit.title}`}
            />
          ))}
        </div>

        <button onClick={() => move(1)} aria-label="Next habit">
          →
        </button>
      </nav>
    </main>
  );
}