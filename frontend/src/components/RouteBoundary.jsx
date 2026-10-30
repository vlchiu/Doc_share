import { Component } from "react";
export default class RouteBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section
          role="alert"
          className="mx-auto max-w-xl rounded-xl border border-blue-100 p-8 text-center"
        >
          <h1 className="text-xl font-bold">Chưa thể mở trang</h1>
          <p className="my-4 text-sm text-slate-600">
            Kiểm tra kết nối và tải lại trang để lấy phiên bản mới nhất.
          </p>
          <button
            className="ds-button-primary"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        </section>
      );
    return this.props.children;
  }
}
