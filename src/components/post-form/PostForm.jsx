import React, { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Input, RTE, Select } from "..";
import appwriteService from "../../appwrite/config";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

export default function PostForm({ post }) {
    const { register, handleSubmit, watch, setValue, control, getValues, formState: { errors } } = useForm({
        defaultValues: {
            title: post?.title || "",
            slug: post?.$id || "",
            content: post?.content || "",
            status: post?.status || "active",
        },
    });

    const navigate = useNavigate();
    const userData = useSelector((state) => state.auth.userData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = async (data) => {
        setIsSubmitting(true);
        try {
            if (post) {
                let fileId = post.featuredImage;
                if (data.image[0]) {
                    const file = await appwriteService.uploadFile(data.image[0]);
                    if (file) {
                        fileId = file.$id;
                        await appwriteService.deleteFile(post.featuredImage);
                    }
                }

                const dbPost = await appwriteService.updatePost(post.$id, {
                    ...data,
                    featuredImage: fileId,
                });

                if (dbPost) {
                    toast.success("Post updated successfully!");
                    navigate(`/post/${dbPost.$id}`);
                }
            } else {
                const file = await appwriteService.uploadFile(data.image[0]);

                if (file) {
                    const fileId = file.$id;
                    const dbPost = await appwriteService.createPost({ ...data, featuredImage: fileId, userId: userData.$id });

                    if (dbPost) {
                        toast.success("Post created successfully!");
                        navigate(`/post/${dbPost.$id}`);
                    }
                }
            }
        } catch (error) {
            console.error("Error submitting post:", error);
            toast.error("An error occurred while submitting the post. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const slugTransform = useCallback((value) => {
        if (value && typeof value === "string")
            return value
                .trim()
                .toLowerCase()
                .replace(/[^a-zA-Z\d\s]+/g, "-")
                .replace(/\s/g, "-");

        return "";
    }, []);

    React.useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name === "title") {
                setValue("slug", slugTransform(value.title), { shouldValidate: true });
            }
        });

        return () => subscription.unsubscribe();
    }, [watch, slugTransform, setValue]);

    return (
        <form onSubmit={handleSubmit(submit)} className="flex flex-wrap">
            <div className="w-full lg:w-2/3 px-2">
                <Input
                    label="Title:"
                    placeholder="Enter post title"
                    className="mb-4"
                    {...register("title", { required: "Title is required" })}
                    error={errors.title}
                />
                <Input
                    label="Slug:"
                    placeholder="post-slug"
                    className="mb-4"
                    {...register("slug", { required: "Slug is required" })}
                    onInput={(e) => {
                        setValue("slug", slugTransform(e.currentTarget.value), { shouldValidate: true });
                    }}
                    error={errors.slug}
                />
                <RTE 
                    label="Content:" 
                    name="content" 
                    control={control} 
                    defaultValue={getValues("content")}
                    rules={{ required: "Content is required" }}
                />
                {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
            </div>
            <div className="w-full lg:w-1/3 px-2 mt-4 lg:mt-0">
                <Input
                    label="Featured Image:"
                    type="file"
                    className="mb-4"
                    accept="image/png, image/jpg, image/jpeg, image/gif"
                    {...register("image", { required: !post })}
                    error={errors.image}
                />
                {post && post.featuredImage && (
                    <div className="w-full mb-4">
                        <img
                            src={appwriteService.getFilePreview(post.featuredImage)}
                            alt={post.title}
                            className="rounded-lg w-full h-auto"
                        />
                    </div>
                )}
                <Select
                    options={["active", "inactive"]}
                    label="Status"
                    className="mb-4"
                    {...register("status", { required: "Status is required" })}
                    error={errors.status}
                />
                <Button 
                    type="submit" 
                    bgColor={post ? "bg-green-500" : undefined} 
                    className="w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Submitting..." : (post ? "Update" : "Submit")}
                </Button>
            </div>
        </form>
    );
}