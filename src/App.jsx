import { useEffect, useMemo, useState } from "react";
import ItemIcon from "./ItemIcon.jsx";
import SparkLine from "./SparkLine.jsx";
import {
  computeFlips,
  fetchBazaar,
  formatCoins,
  formatPct,
} from "./bazaar.js";

function ProfitBlock({ revenue, profit, margin }) {
  const cls = profit >= 0 ? "profit-pos" : "profit-neg";
  const sign = profit >= 0 ? "+" : "";
  return (
    <div className="profit-block">
      <div className="profit-revenue">{formatCoins(revenue)}</div>
      <div className={cls}>
        {sign}{formatCoins(profit)} ({sign}{formatPct(margin)})
      </div>
    </div>
  );
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function App() {
  const [products, setProducts] = useState(null);
  const [recipes, setRecipes] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("insta_profit");
  const [query, setQuery] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const clock = useClock();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [data, recipesData] = await Promise.all([
          fetchBazaar(),
          fetch("/recipes.json").then(res => res.json())
        ]);
        if (!cancelled) {
          setProducts(data);
          setRecipes(recipesData);
          setUpdatedAt(new Date());
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const rows = useMemo(() => {
    if (!products || !recipes) return [];
    return computeFlips(recipes, products);
  }, [products, recipes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter(
          (row) =>
            row.name.toLowerCase().includes(needle) ||
            row.id.toLowerCase().includes(needle),
        )
      : rows;

    const copy = [...filtered];
    if (sort === "insta_margin") {
      copy.sort((a, b) => b.instantMargin - a.instantMargin);
    } else if (sort === "offer_profit") {
      copy.sort((a, b) => b.offerProfit - a.offerProfit);
    } else if (sort === "offer_margin") {
      copy.sort((a, b) => b.offerMargin - a.offerMargin);
    } else {
      copy.sort((a, b) => b.instantProfit - a.instantProfit);
    }
    return copy;
  }, [rows, query, sort]);

  return (
    <div className="cy-app">
      <header className="cy-header">
        <div className="cy-title">
          <span className="cy-title-jp">バザーフリッパー</span>
          <span className="cy-title-sep">//</span>
          <span className="cy-title-en">BAZAAR FLIPPER</span>
        </div>
        <div className="cy-controls">
          <div className="cy-control-group">
            <label className="cy-label" htmlFor="search">Find</label>
            <input
              className="cy-input"
              id="search"
              type="text"
              placeholder="Search crafts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="cy-control-group">
            <label className="cy-label" htmlFor="sort">Sort</label>
            <select
              className="cy-select"
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="insta_profit">Insta-Sell Profit</option>
              <option value="insta_margin">Insta-Sell Margin %</option>
              <option value="offer_profit">Sell Offer Profit</option>
              <option value="offer_margin">Sell Offer Margin %</option>
            </select>
          </div>
          <div className="cy-badge">LIVE_DATA</div>
        </div>
      </header>

      <main className="cy-workspace">
        <div className="cy-panel">
          {loading && !products ? (
            <div className="cy-state-msg cy-blink">ACCESSING HYPIXEL API...</div>
          ) : error && !products ? (
            <div className="cy-state-msg" style={{ color: "var(--neon-red)" }}>
              CONNECTION FAILED // {error}
            </div>
          ) : (
            <table className="cy-table">
              <thead>
                <tr>
                  <th>
                    <span className="cy-th-en">Output Item</span>
                    <span className="cy-th-jp">出力アイテム</span>
                  </th>
                  <th>
                    <span className="cy-th-en">Ingredients</span>
                    <span className="cy-th-jp">材料</span>
                  </th>
                  <th>
                    <span className="cy-th-en">Total Cost</span>
                    <span className="cy-th-jp">費用</span>
                  </th>
                  <th>
                    <span className="cy-th-en">Instant Sale</span>
                    <span className="cy-th-jp">即売</span>
                  </th>
                  <th>
                    <span className="cy-th-en">Sell Offer</span>
                    <span className="cy-th-jp">売値</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="item-cell">
                        <ItemIcon itemId={row.id} name={row.name} texture={row.texture} />
                        <div className="item-name-text">
                          <span className="item-name-label">{row.name}</span>
                          {row.count > 1 && <span className="item-count-badge">x{row.count} YIELD</span>}
                        </div>
                        <SparkLine points={row.sparkPoints} />
                      </div>
                    </td>
                    <td>
                      <div className="ingredient-list">
                        {row.ingredients.map((ing) => (
                          <div key={`${row.id}-${ing.id}`} className="ingredient-chip" title={`${ing.name} x${ing.qty}`}>
                            <ItemIcon itemId={ing.id} name={ing.name} texture={ing.texture} size={16} />
                            <span className="ingredient-qty">x{ing.qty}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="cy-num">{formatCoins(row.cost)}</span>
                    </td>
                    <td>
                      <ProfitBlock
                        revenue={row.instantRevenue}
                        profit={row.instantProfit}
                        margin={row.instantMargin}
                      />
                    </td>
                    <td>
                      <ProfitBlock
                        revenue={row.offerRevenue}
                        profit={row.offerProfit}
                        margin={row.offerMargin}
                      />
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="cy-state-msg">NO MATCHING DATA FOUND // 該当なし</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <footer className="cy-hud">
        <div className="cy-hud-field">
          ENTRIES <span className="cy-hud-val">{visible.length}</span>
        </div>
        <div className="cy-hud-field">
          SYNC <span className="cy-hud-val">{updatedAt ? updatedAt.toLocaleTimeString() : "PENDING"}</span>
        </div>
        <div className="cy-hud-field">
          STATUS <span className="cy-hud-val">SECURE</span>
        </div>
        <div className="cy-hud-field cy-hud-clock">{clock}</div>
      </footer>
    </div>
  );
}
