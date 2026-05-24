import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import BottomFooter from "../components/BottomFooter";
import SemanticSearch from "../components/SemanticSearch";
import Preloader from "../helper/Preloader";
import ColorInit from "../helper/ColorInit";
import ScrollToTop from "react-scroll-to-top";

const SearchPage = () => (
  <>
    <Preloader />
    <ScrollToTop smooth color="#299E60" />
    <ColorInit color={false} />
    <HeaderOne />
    <section className="py-80">
      <div className="container container-lg">
        <div className="mb-32">
          <h4 className="mb-8">🧠 AI Semantic Search</h4>
          <p className="text-gray-500">
            Search by meaning — not just keywords. Powered by local AI embeddings and Valkey.
          </p>
        </div>
        <SemanticSearch />
      </div>
    </section>
    <FooterOne />
    <BottomFooter />
  </>
);

export default SearchPage;
