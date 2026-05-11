export default function HabitCard({ total }) {
  return (
    <section className="card stat-card">
      <h2>Product Items</h2>
      <p className="stat-number">{total}</p>
      <p className="muted">Total items in your dashboard list.</p>
    </section>
  );
}
