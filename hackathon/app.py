"""The Streamlit prototype has been replaced by the Gukura web app. This page forwards visitors."""
import streamlit as st

URL = "https://pacyuzu16.github.io/NISR/"

st.set_page_config(page_title="Gukura has moved", layout="centered")
st.markdown(f'<meta http-equiv="refresh" content="0; url={URL}">', unsafe_allow_html=True)
st.title("Gukura has moved")
st.write("The child stunting explorer is now a faster, mobile-friendly web app.")
st.link_button("Open Gukura", URL, type="primary")
