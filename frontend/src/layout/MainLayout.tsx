import ParachainTable from "components/ParachainTable";
import NavBar from "components/NavBar";
import Footer from "components/Footer";
import { ApiPromiseContextProvider, RelayerContextProvider } from "context";

const MainLayout = () => {
  return (
    <>
      <NavBar />

      <ApiPromiseContextProvider>
        <RelayerContextProvider>
          <ParachainTable />
        </RelayerContextProvider>
      </ApiPromiseContextProvider>

      <Footer />
    </>
  );
};

export default MainLayout;
