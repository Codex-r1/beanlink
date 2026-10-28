function Onboarding({ user, onComplete }) {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (selectedRole) => {
    setLoading(true);
    try {
      const data = await completeOnboarding(selectedRole);
      onComplete(data.user); // Pass the updated user back to App
    } catch (err) {
      alert("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agri-root min-h-screen flex items-center justify-center px-5 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 flex items-center justify-center rounded mx-auto mb-4" style={{ background: "var(--primary)" }}>
            <Sprout size={24} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to BeanLink, {user.full_name.split(" ")[0]}!</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Let's personalize your experience. What do you want to achieve?
          </p>
        </div>

        <div className="space-y-3">
          {[
            { role: "farmer", icon: Sprout, title: "I want to grow and sell beans", desc: "Get AI recommendations, list harvests, and track market prices." },
            { role: "buyer", icon: ShoppingBag, title: "I want to purchase beans and products", desc: "Browse high-quality produce and connect directly with farmers." },
            { role: "supplier", icon: Package, title: "I want to supply farm inputs and machinery", desc: "List and sell seeds, fertilizers, and equipment to farmers." }
          ].map((opt) => (
            <button
              key={opt.role}
              disabled={loading}
              onClick={() => handleSelect(opt.role)}
              className="w-full text-left p-4 rounded border agri-card transition-all hover:border-green-600 hover:shadow-md disabled:opacity-50"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--primary-soft)" }}>
                  <opt.icon size={20} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: "var(--text)" }}>{opt.title}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{opt.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}