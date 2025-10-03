import React, { useEffect } from "react";
import Layout from "../Layout";
import AffilatePayout from "../../components/affiliate/AffiliatePayout";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getMe } from "../../features/authSlice";

const AffilatePayouts = () => {
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
      <AffilatePayout />
    </Layout>
  );
};

export default AffilatePayouts;
