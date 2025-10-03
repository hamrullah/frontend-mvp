import React, { useEffect } from "react";
import Layout from "../Layout";
import AffilatePreview from "../../components/affiliate/AffiliatePreview";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getMe } from "../../features/authSlice";

const AffilatePreviews = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isError } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getMe());
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      navigate("/");
    }
  }, [isError, navigate]);
  return (
    <Layout>
      <AffilatePreview />
    </Layout>
  );
};

export default AffilatePreviews;
